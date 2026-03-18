/**
 * VideoClipPlayer — plays a video file into an offscreen canvas.
 *
 * Each instance draws frames to its own _canvas at native resolution.
 * DeckMixer reads those canvases and composites them into the final
 * output that gets piped into modV's render pipeline.
 *
 * Export both the class (for DeckMixer) and a legacy singleton default
 * so any remaining direct imports still work.
 */

import Hls from "hls.js";

const LOOP_MODES = ["loop", "ping-pong", "once", "hold"];

export class VideoClipPlayer {
  constructor() {
    this._video = null;
    this._canvas = null;
    this._ctx = null;
    this._raf = null;
    this._objectURL = null;
    this._pingPongDir = 1;
    this.loopMode = "loop";
    this.speed = 1.0;
    this._active = false;
    this._reversed = false;
    this._loopIn = 0;
    this._loopOut = 1;
  }

  get currentTime() {
    return this._video ? this._video.currentTime : 0;
  }

  get duration() {
    return this._video && isFinite(this._video.duration)
      ? this._video.duration
      : 0;
  }

  get progress() {
    return this.duration > 0 ? this.currentTime / this.duration : 0;
  }

  get canvas() {
    return this._canvas;
  }

  get isPlaying() {
    return this._active && this._video !== null;
  }

  /** Play a File or source object through this player's canvas. */
  async play(
    source,
    { loopMode = "loop", speed = 1.0, loopIn = 0, loopOut = 1 } = {}
  ) {
    this.stop();

    if (!source) {
      return;
    }

    this.loopMode = LOOP_MODES.includes(loopMode) ? loopMode : "loop";
    this.speed = Math.max(0.05, Math.min(32, Number(speed) || 1));
    this._loopIn = Math.max(0, Math.min(1, Number(loopIn) || 0));
    this._loopOut = Math.max(
      0,
      Math.min(1, Number(loopOut) !== undefined ? Number(loopOut) : 1)
    );
    if (this._loopOut <= this._loopIn) {
      this._loopOut = 1;
    }

    const url =
      source instanceof File
        ? URL.createObjectURL(source)
        : source.url || source;

    this._objectURL = source instanceof File ? url : null;

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.loop = this.loopMode === "loop";
    video.playbackRate = this.speed;

    await new Promise((resolve, reject) => {
      if (
        typeof url === "string" &&
        (url.includes(".m3u8") || url.includes("m3u8")) &&
        Hls.isSupported()
      ) {
        // HLS stream (live cams, etc.)
        const hls = new Hls({ enableWorker: false });
        this._hls = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, resolve);
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) {
            reject(new Error(data.details));
          }
        });
      } else {
        video.src = url;
        video.addEventListener("canplay", resolve, { once: true });
        video.addEventListener("error", reject, { once: true });
        video.load();
      }
    });

    this._video = video;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });

    this._canvas = canvas;
    this._ctx = ctx;

    video.play().catch(() => {});
    this._active = true;

    if (this.loopMode === "ping-pong") {
      this._setupPingPong(video);
    }

    if (this.loopMode === "once") {
      video.addEventListener(
        "ended",
        () => {
          this._active = false;
        },
        { once: true }
      );
    }

    const drawFrame = () => {
      if (!this._active) {
        return;
      }

      if (video.readyState >= 2) {
        const dur = video.duration;
        if (isFinite(dur) && dur > 0) {
          const inT = this._loopIn * dur;
          const outT = this._loopOut * dur;
          if (this._reversed) {
            const step = Math.max(0.016, this.speed / 30);
            const next = video.currentTime - step;
            video.currentTime = next <= inT ? outT : next;
          } else if (this.loopMode === "loop" && video.currentTime >= outT) {
            video.currentTime = inT;
          }
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      this._raf = requestAnimationFrame(drawFrame);
    };

    drawFrame();
  }

  get isReversed() {
    return this._reversed;
  }

  get isFrozen() {
    return (
      this._active &&
      this._video !== null &&
      this._video.paused &&
      !this._reversed
    );
  }

  freeze() {
    if (this._video && !this._video.paused) {
      this._video.pause();
    }
  }

  unfreeze() {
    if (this._video && this._video.paused && this._active && !this._reversed) {
      this._video.play().catch(() => {});
    }
  }

  setReversed(val) {
    this._reversed = Boolean(val);

    if (this._video) {
      if (this._reversed) {
        this._video.pause();
      } else if (this._active) {
        this._video.play().catch(() => {});
      }
    }
  }

  toggleFreeze() {
    if (this.isFrozen) {
      this.unfreeze();
    } else {
      this.freeze();
    }
  }

  /** Update playback rate on the running clip. */
  setSpeed(speed) {
    this.speed = Math.max(0.05, Math.min(32, Number(speed) || 1));

    if (this._video) {
      this._video.playbackRate = this.speed;
    }
  }

  /** Nudge the current time by delta seconds (clamped to duration). */
  nudge(deltaSec) {
    if (this._video && isFinite(this._video.duration)) {
      this._video.currentTime = Math.max(
        0,
        Math.min(this._video.duration, this._video.currentTime + deltaSec)
      );
    }
  }

  /** Seek to normalised position 0–1. */
  seek(t) {
    if (this._video && isFinite(this._video.duration)) {
      this._video.currentTime = Math.max(
        0,
        Math.min(this._video.duration, t * this._video.duration)
      );
    }
  }

  /**
   * Play a live MediaStream (e.g. webcam) through this player's canvas.
   * Behaves like play() but skips BPM/loop logic — just draws frames.
   */
  async playStream(stream) {
    this.stop();

    if (!stream) {
      return;
    }

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.srcObject = stream;

    await new Promise((resolve, reject) => {
      video.addEventListener("loadedmetadata", resolve, { once: true });
      video.addEventListener("error", reject, { once: true });
    });

    this._video = video;
    this._camStream = stream;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });

    this._canvas = canvas;
    this._ctx = ctx;

    video.play().catch(() => {});
    this._active = true;

    const drawFrame = () => {
      if (!this._active) {
        return;
      }

      if (video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      this._raf = requestAnimationFrame(drawFrame);
    };

    drawFrame();
  }

  stop() {
    this._active = false;
    this._reversed = false;
    this._loopIn = 0;
    this._loopOut = 1;

    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }

    if (this._hls) {
      this._hls.destroy();
      this._hls = null;
    }

    if (this._video) {
      this._video.pause();
      this._video.srcObject = null;
      this._video.src = "";
      this._video.load();
      this._video = null;
    }

    if (this._camStream) {
      const tracks = this._camStream.getTracks();

      for (let i = 0, len = tracks.length; i < len; i++) {
        tracks[i].stop();
      }

      this._camStream = null;
    }

    if (this._objectURL) {
      URL.revokeObjectURL(this._objectURL);
      this._objectURL = null;
    }

    this._canvas = null;
    this._ctx = null;
  }

  _setupPingPong(video) {
    this._pingPongDir = 1;
    video.loop = false;

    video.addEventListener("ended", () => {
      if (!this._active) {
        return;
      }

      this._pingPongDir *= -1;

      if (this._pingPongDir < 0) {
        const stepBack = () => {
          if (!this._active || this._pingPongDir > 0) {
            return;
          }

          video.currentTime = Math.max(0, video.currentTime - 0.033);

          if (video.currentTime <= 0) {
            this._pingPongDir = 1;
            video.play().catch(() => {});
            return;
          }

          setTimeout(stepBack, 33);
        };

        stepBack();
      } else {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    });
  }
}

// Legacy singleton export — kept for any direct imports that predate DeckMixer
export default new VideoClipPlayer();
