/**
 * DeckMixer — owns two VideoClipPlayer instances (A and B) and composites
 * their canvases onto a single output canvas whose captureStream is piped
 * into modV's render pipeline.
 *
 * Crossfader value (0 = 100% A, 1 = 100% B) comes from the ui-store so
 * MIDI CC, LFO, and manual slider all flow through the same path.
 *
 * Call deckMixer.start() once on app mount.
 */

import { VideoClipPlayer } from "./VideoClipPlayer";
import store from "../ui-store";

const GALLERY_GROUP_NAME = "modV internal Gallery Group";
const VIDEO_CLIP_MODULE_NAME = "VideoClip";

// Blend mode used when compositing B over A.
// "source-over" gives a clean linear alpha crossfade.
const BLEND_MODE = "source-over";

class DeckMixer {
  constructor() {
    this.playerA = new VideoClipPlayer();
    this.playerB = new VideoClipPlayer();
    this._masterSpeedA = 1.0;
    this._masterSpeedB = 1.0;
    this._canvas = null;
    this._ctx = null;
    this._stream = null;
    this._raf = null;
    this._active = false;
  }

  getMasterSpeed(deck) {
    return deck === "A" ? this._masterSpeedA : this._masterSpeedB;
  }

  setMasterSpeed(deck, speed) {
    const clamped = Math.max(0.1, Math.min(16, Number(speed) || 1));

    if (deck === "A") {
      this._masterSpeedA = clamped;

      if (this.playerA._video) {
        this.playerA._video.playbackRate = clamped;
      }
    } else {
      this._masterSpeedB = clamped;

      if (this.playerB._video) {
        this.playerB._video.playbackRate = clamped;
      }
    }
  }

  get modV() {
    return window.modV;
  }

  /** Wire up the output canvas and start the composite loop. */
  start() {
    if (this._active) {
      return;
    }

    this._canvas = document.createElement("canvas");
    this._canvas.width = 1280;
    this._canvas.height = 720;
    this._ctx = this._canvas.getContext("2d");

    const stream = this._canvas.captureStream(60);
    this._stream = stream;
    const [track] = stream.getVideoTracks();

    if (track && this.modV) {
      this.modV._imageCapture = new ImageCapture(track);
    }

    this._active = true;

    // Try to ensure VideoClip module exists in modV pipeline
    this._ensureVideoClipModule();

    this._loop();
  }

  _loop() {
    if (!this._active) {
      return;
    }

    const cf = store.state["clip-launcher"]?.crossfader ?? 0.5;
    const alphaA = Math.max(0, Math.min(1, 1 - cf));
    const alphaB = Math.max(0, Math.min(1, cf));
    const ctx = this._ctx;
    const w = this._canvas.width;
    const h = this._canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw deck A
    if (this.playerA.canvas && this.playerA.isPlaying && alphaA > 0.001) {
      ctx.globalAlpha = alphaA;
      ctx.globalCompositeOperation = BLEND_MODE;
      ctx.drawImage(this.playerA.canvas, 0, 0, w, h);
    }

    // Draw deck B on top with its alpha
    if (this.playerB.canvas && this.playerB.isPlaying && alphaB > 0.001) {
      ctx.globalAlpha = alphaB;
      ctx.globalCompositeOperation = BLEND_MODE;
      ctx.drawImage(this.playerB.canvas, 0, 0, w, h);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    this._raf = requestAnimationFrame(() => this._loop());
  }

  stop() {
    this._active = false;

    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }

    this.playerA.stop();
    this.playerB.stop();

    if (this._stream) {
      const tracks = this._stream.getTracks();

      for (let i = 0, len = tracks.length; i < len; i++) {
        tracks[i].stop();
      }

      this._stream = null;
    }

    this._canvas = null;
    this._ctx = null;

    if (this.modV) {
      this.modV._imageCapture = null;
    }
  }

  /** Output canvas — used for preview rendering in the UI. */
  get canvas() {
    return this._canvas;
  }

  /**
   * Progress of the dominant deck (the one with more crossfader weight).
   * Used by the UI progress bar.
   */
  get progress() {
    const cf = store.state["clip-launcher"]?.crossfader ?? 0.5;

    return cf > 0.5 ? this.playerB.progress : this.playerA.progress;
  }

  /**
   * Lazily ensure the VideoClip module is present in at least one non-gallery
   * group so output is visible without manual setup.
   */
  async _ensureVideoClipModule() {
    if (!this.modV) {
      return;
    }

    const workerStore = this.modV.store;
    const groups = workerStore.state.groups.groups;

    if (!groups || groups.length === 0) {
      return;
    }

    const activeModules = workerStore.state.modules.active || {};
    const hasVideoClipActive = Object.values(activeModules).some(
      (m) =>
        m.meta && m.meta.name === VIDEO_CLIP_MODULE_NAME && !m.meta.isGallery
    );

    if (hasVideoClipActive) {
      return;
    }

    const targetGroup = groups.find((g) => g.name !== GALLERY_GROUP_NAME);

    if (!targetGroup) {
      return;
    }

    try {
      const module = await workerStore.dispatch("modules/makeActiveModule", {
        moduleName: VIDEO_CLIP_MODULE_NAME,
      });

      if (module && module.$id) {
        workerStore.commit("groups/ADD_MODULE_TO_GROUP", {
          moduleId: module.$id,
          groupId: targetGroup.id,
          position: targetGroup.modules ? targetGroup.modules.length : 0,
        });
      }
    } catch (e) {
      console.warn("[DeckMixer] Could not auto-add VideoClip module:", e);
    }
  }
}

export default new DeckMixer();
