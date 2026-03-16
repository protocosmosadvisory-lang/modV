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
  async play(source, { loopMode = "loop", speed = 1.0 } = {}) {
    this.stop();

    if (!source) {
      return;
    }

    this.loopMode = LOOP_MODES.includes(loopMode) ? loopMode : "loop";
    this.speed = Math.max(0.1, Math.min(16, Number(speed) || 1));

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
    video.src = url;

    await new Promise((resolve, reject) => {
      video.addEventListener("canplay", resolve, { once: true });
      video.addEventListener("error", reject, { once: true });
      video.load();
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
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      this._raf = requestAnimationFrame(drawFrame);
    };

    drawFrame();
  }

  /** Update playback rate on the running clip. */
  setSpeed(speed) {
    this.speed = Math.max(0.1, Math.min(16, Number(speed) || 1));

    if (this._video) {
      this._video.playbackRate = this.speed;
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

  stop() {
    this._active = false;

    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }

    if (this._video) {
      this._video.pause();
      this._video.src = "";
      this._video.load();
      this._video = null;
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
