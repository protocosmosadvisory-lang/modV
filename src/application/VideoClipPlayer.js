/**
 * VideoClipPlayer — routes a video file into modV's render pipeline.
 *
 * Strategy: play the file in a hidden <video> element, draw each frame to an
 * offscreen <canvas>, then hijack modV's `_imageCapture` with a captureStream()
 * track from that canvas.  The existing inputLoop() in index.js picks up the
 * new ImageCapture unchanged, and any Webcam-type module already in a group
 * will render the clip automatically.
 */

const LOOP_MODES = ["loop", "ping-pong", "once", "hold"];

class VideoClipPlayer {
  constructor() {
    this._video = null;
    this._canvas = null;
    this._ctx = null;
    this._stream = null;
    this._raf = null;
    this._objectURL = null;
    this._pingPongDir = 1;
    this.loopMode = "loop";
    this.speed = 1.0;
    this._active = false;
  }

  get modV() {
    return window.modV;
  }

  /** Play a File or path string through the modV render pipeline. */
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
    video.loop = loopMode === "loop";
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

    // Pipe the canvas into modV's image capture slot
    const stream = canvas.captureStream(60);
    this._stream = stream;
    const [track] = stream.getVideoTracks();

    if (track && this.modV) {
      this.modV._imageCapture = new ImageCapture(track);
    }

    video.play().catch(() => {});
    this._active = true;

    // Handle ping-pong
    if (loopMode === "ping-pong") {
      this._setupPingPong(video);
    }

    // Handle "once" — stop after playback ends
    if (loopMode === "once") {
      video.addEventListener(
        "ended",
        () => {
          this._active = false;
        },
        { once: true }
      );
    }

    // Draw loop
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

  /** Update speed on the currently playing clip. */
  setSpeed(speed) {
    this.speed = Math.max(0.1, Math.min(16, Number(speed) || 1));
    if (this._video) {
      this._video.playbackRate = this.speed > 0 ? this.speed : 0.1;
      if (this.speed < 0 && !this._video.loop) {
        // Reverse: seek backward manually via timeupdate
        this._setupReverse();
      }
    }
  }

  /** Seek to a specific time (0–1 normalized). */
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

    if (this._stream) {
      const tracks = this._stream.getTracks();
      for (let i = 0, len = tracks.length; i < len; i++) {
        tracks[i].stop();
      }
      this._stream = null;
    }

    if (this._objectURL) {
      URL.revokeObjectURL(this._objectURL);
      this._objectURL = null;
    }

    if (this.modV) {
      this.modV._imageCapture = null;
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
        // Reverse: step backward manually
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

export default new VideoClipPlayer();
