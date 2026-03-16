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

const BLEND_MODES = ["cross", "add", "screen", "multiply", "overlay"];

class DeckMixer {
  constructor() {
    this.playerA = new VideoClipPlayer();
    this.playerB = new VideoClipPlayer();
    this._masterSpeedA = 1.0;
    this._masterSpeedB = 1.0;
    this._opacityA = 1.0;
    this._opacityB = 1.0;
    this.blendMode = "cross"; // cross | add | screen | multiply | overlay
    this._fxA = { brightness: 1.0, contrast: 1.0, saturation: 1.0, hue: 0 };
    this._fxB = { brightness: 1.0, contrast: 1.0, saturation: 1.0, hue: 0 };
    this._canvas = null;
    this._ctx = null;
    this._stream = null;
    this._raf = null;
    this._active = false;

    // Beat-reactive flash
    this.beatFlashEnabled = false;
    this.beatFlashIntensity = 0.35; // max brightness boost on kick
    this._kickFlash = 0;
    this._lastKick = false;

    // Master blackout (0 = full black, 1 = normal)
    this._masterOpacity = 1.0;
    this._targetMasterOpacity = 1.0;
    this.blackout = false;
  }

  setBlackout(active) {
    this.blackout = active;
    this._targetMasterOpacity = active ? 0 : 1;
  }

  setMasterOpacity(value) {
    this._masterOpacity = Math.max(0, Math.min(1, Number(value) || 0));
  }

  setFx(deck, params) {
    const target = deck === "A" ? this._fxA : this._fxB;

    if (params.brightness !== undefined) {
      target.brightness = Math.max(0, Math.min(4, Number(params.brightness)));
    }

    if (params.contrast !== undefined) {
      target.contrast = Math.max(0, Math.min(4, Number(params.contrast)));
    }

    if (params.saturation !== undefined) {
      target.saturation = Math.max(0, Math.min(4, Number(params.saturation)));
    }

    if (params.hue !== undefined) {
      target.hue = Number(params.hue) % 360;
    }
  }

  getFx(deck) {
    return deck === "A" ? { ...this._fxA } : { ...this._fxB };
  }

  _buildFilter(fx) {
    const parts = [];

    if (fx.brightness !== 1.0) {
      parts.push(`brightness(${fx.brightness.toFixed(2)})`);
    }

    if (fx.contrast !== 1.0) {
      parts.push(`contrast(${fx.contrast.toFixed(2)})`);
    }

    if (fx.saturation !== 1.0) {
      parts.push(`saturate(${fx.saturation.toFixed(2)})`);
    }

    if (fx.hue !== 0) {
      parts.push(`hue-rotate(${Math.round(fx.hue)}deg)`);
    }

    return parts.length > 0 ? parts.join(" ") : "none";
  }

  setBlendMode(mode) {
    if (BLEND_MODES.includes(mode)) {
      this.blendMode = mode;
    }
  }

  setOpacity(deck, value) {
    const clamped = Math.max(0, Math.min(1, Number(value) || 1));

    if (deck === "A") {
      this._opacityA = clamped;
    } else {
      this._opacityB = clamped;
    }
  }

  getOpacity(deck) {
    return deck === "A" ? this._opacityA : this._opacityB;
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
    const ctx = this._ctx;
    const w = this._canvas.width;
    const h = this._canvas.height;
    const mode = this.blendMode;

    ctx.clearRect(0, 0, w, h);

    // Beat-reactive flash: detect rising edge on beats.kick
    if (this.beatFlashEnabled) {
      const kick = Boolean(window.modV?.store?.state?.beats?.kick);

      if (kick && !this._lastKick) {
        this._kickFlash = 1.0;
      }

      this._lastKick = kick;
      this._kickFlash *= 0.82; // exponential decay (~10 frames to near-zero at 60fps)
    } else {
      this._kickFlash = 0;
    }

    const flashBoost = this._kickFlash * this.beatFlashIntensity;

    const alphaA = Math.max(0, Math.min(1, (1 - cf) * this._opacityA));
    const alphaB = Math.max(0, Math.min(1, cf * this._opacityB));

    // Apply flash boost on top of user-set FX brightness
    const fxAWithFlash =
      flashBoost > 0.005
        ? { ...this._fxA, brightness: this._fxA.brightness + flashBoost }
        : this._fxA;
    const fxBWithFlash =
      flashBoost > 0.005
        ? { ...this._fxB, brightness: this._fxB.brightness + flashBoost }
        : this._fxB;

    const filterA = this._buildFilter(fxAWithFlash);
    const filterB = this._buildFilter(fxBWithFlash);

    const compositeOp =
      mode === "add"
        ? "lighter"
        : mode === "screen"
        ? "screen"
        : mode === "multiply"
        ? "multiply"
        : mode === "overlay"
        ? "overlay"
        : "source-over"; // cross uses source-over

    if (this.playerA.canvas && this.playerA.isPlaying && alphaA > 0.001) {
      ctx.globalAlpha = alphaA;
      ctx.filter = filterA;
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(this.playerA.canvas, 0, 0, w, h);
    }

    if (this.playerB.canvas && this.playerB.isPlaying && alphaB > 0.001) {
      ctx.globalAlpha = alphaB;
      ctx.filter = filterB;
      ctx.globalCompositeOperation =
        mode === "cross" ? "source-over" : compositeOp;
      ctx.drawImage(this.playerB.canvas, 0, 0, w, h);
    }

    // Animate master opacity toward target (smooth blackout/fadein)
    const opacityDiff = this._targetMasterOpacity - this._masterOpacity;

    if (Math.abs(opacityDiff) > 0.002) {
      this._masterOpacity += opacityDiff * 0.15; // ~15 frames to transition
    } else {
      this._masterOpacity = this._targetMasterOpacity;
    }

    // Apply master opacity as a full-canvas overlay if not 1.0
    if (this._masterOpacity < 0.999) {
      ctx.globalAlpha = 1 - this._masterOpacity;
      ctx.filter = "none";
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
    }

    ctx.globalAlpha = 1;
    ctx.filter = "none";
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
