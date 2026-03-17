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

const BLEND_MODES = [
  "cross",
  "add",
  "screen",
  "multiply",
  "overlay",
  "difference",
  "exclusion",
  "hard-light",
  "soft-light",
  "darken",
  "lighten",
];

class DeckMixer {
  constructor() {
    this.playerA = new VideoClipPlayer();
    this.playerB = new VideoClipPlayer();
    this._masterSpeedA = 1.0;
    this._masterSpeedB = 1.0;
    this._opacityA = 1.0;
    this._opacityB = 1.0;
    this.blendMode = "cross"; // cross | add | screen | multiply | overlay
    this._fxA = {
      brightness: 1.0,
      contrast: 1.0,
      saturation: 1.0,
      hue: 0,
      blur: 0,
      grayscale: 0,
      invert: 0,
      sepia: 0,
    };
    this._fxB = {
      brightness: 1.0,
      contrast: 1.0,
      saturation: 1.0,
      hue: 0,
      blur: 0,
      grayscale: 0,
      invert: 0,
      sepia: 0,
    };
    this._masterBrightness = 1.0;
    this._canvas = null;
    this._ctx = null;
    this._stream = null;
    this._track = null;
    this._raf = null;
    this._active = false;

    // Beat-reactive flash
    this.beatFlashEnabled = false;
    this.beatFlashIntensity = 0.35; // max brightness boost on kick
    this._kickFlash = 0;
    this._lastKick = false;

    // Beat-reactive zoom
    this.beatZoomEnabled = false;
    this.beatZoomIntensity = 0.06; // max scale delta on kick (e.g. 0.06 = 6%)
    this._zoomScale = 0; // additive zoom above 1.0, decays to 0

    // Master blackout (0 = full black, 1 = normal)
    this._masterOpacity = 1.0;
    this._targetMasterOpacity = 1.0;
    this.blackout = false;

    // Master whiteout (0 = no white, 1 = full white)
    this._masterWhite = 0;
    this._targetMasterWhite = 0;
    this.whiteout = false;

    // Trail / echo feedback
    this.trailEnabled = false;
    this.trailDecay = 0.85; // 0 = no trail, 1 = infinite persistence

    // Per-deck mirror (horizontal flip)
    this.mirrorA = false;
    this.mirrorB = false;

    // Per-deck tile mode: null | "2x2" | "mirror4"
    this.tileModeA = null;
    this.tileModeB = null;

    // Per-deck position offset (normalized, -1..1) and scale (0.25..2)
    this._posXA = 0;
    this._posYA = 0;
    this._scaleA = 1;
    this._posXB = 0;
    this._posYB = 0;
    this._scaleB = 1;

    // Per-deck chromatic aberration (pixel offset, 0 = off)
    this._chromaA = 0;
    this._chromaB = 0;

    // Strobe effect
    this.strobeEnabled = false;
    this.strobeHz = 8; // flashes per second

    // Master output FX (applied after compositing on second canvas)
    this._masterContrast = 1.0;
    this._masterSaturation = 1.0;
    this._masterHue = 0;
    this._masterHueSpin = 0; // degrees per second, continuously rotates hue

    // Second-pass output canvas (master FX applied here)
    this._outCanvas = null;
    this._outCtx = null;

    // Video recording
    this._mediaRecorder = null;
    this._recordChunks = [];
    this._recordingStartTime = 0;
  }

  setBlackout(active) {
    this.blackout = active;
    this._targetMasterOpacity = active ? 0 : 1;
  }

  setWhiteout(active) {
    this.whiteout = active;
    this._targetMasterWhite = active ? 1 : 0;
  }

  setMirror(deck, enabled) {
    if (deck === "A") {
      this.mirrorA = Boolean(enabled);
    } else {
      this.mirrorB = Boolean(enabled);
    }
  }

  setDeckTransform(deck, { posX, posY, scale } = {}) {
    if (deck === "A") {
      if (posX !== undefined) {
        this._posXA = Math.max(-1, Math.min(1, Number(posX) || 0));
      }

      if (posY !== undefined) {
        this._posYA = Math.max(-1, Math.min(1, Number(posY) || 0));
      }

      if (scale !== undefined) {
        this._scaleA = Math.max(0.1, Math.min(3, Number(scale) || 1));
      }
    } else {
      if (posX !== undefined) {
        this._posXB = Math.max(-1, Math.min(1, Number(posX) || 0));
      }

      if (posY !== undefined) {
        this._posYB = Math.max(-1, Math.min(1, Number(posY) || 0));
      }

      if (scale !== undefined) {
        this._scaleB = Math.max(0.1, Math.min(3, Number(scale) || 1));
      }
    }
  }

  getDeckTransform(deck) {
    if (deck === "A") {
      return { posX: this._posXA, posY: this._posYA, scale: this._scaleA };
    }

    return { posX: this._posXB, posY: this._posYB, scale: this._scaleB };
  }

  setTileMode(deck, mode) {
    const valid = [null, "2x2", "mirror4"];
    const safeMode = valid.includes(mode) ? mode : null;

    if (deck === "A") {
      this.tileModeA = safeMode;
    } else {
      this.tileModeB = safeMode;
    }
  }

  setChroma(deck, offset) {
    const v = Math.max(0, Math.min(40, Number(offset) || 0));

    if (deck === "A") {
      this._chromaA = v;
    } else {
      this._chromaB = v;
    }
  }

  getChroma(deck) {
    return deck === "A" ? this._chromaA : this._chromaB;
  }

  setReversed(deck, val) {
    if (deck === "A") {
      this.playerA.setReversed(val);
    } else {
      this.playerB.setReversed(val);
    }
  }

  setTrail(enabled, decay) {
    this.trailEnabled = Boolean(enabled);

    if (decay !== undefined) {
      this.trailDecay = Math.max(0, Math.min(0.99, Number(decay) || 0.85));
    }
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

    if (params.blur !== undefined) {
      target.blur = Math.max(0, Math.min(20, Number(params.blur) || 0));
    }

    if (params.grayscale !== undefined) {
      target.grayscale = Math.max(
        0,
        Math.min(1, Number(params.grayscale) || 0)
      );
    }

    if (params.invert !== undefined) {
      target.invert = Math.max(0, Math.min(1, Number(params.invert) || 0));
    }

    if (params.sepia !== undefined) {
      target.sepia = Math.max(0, Math.min(1, Number(params.sepia) || 0));
    }
  }

  setMasterBrightness(value) {
    this._masterBrightness = Math.max(0, Math.min(2, Number(value) || 1));
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

    if (fx.blur > 0) {
      parts.push(`blur(${fx.blur.toFixed(1)}px)`);
    }

    if (fx.grayscale > 0) {
      parts.push(`grayscale(${fx.grayscale.toFixed(2)})`);
    }

    if (fx.invert > 0) {
      parts.push(`invert(${fx.invert.toFixed(2)})`);
    }

    if (fx.sepia > 0) {
      parts.push(`sepia(${fx.sepia.toFixed(2)})`);
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
    const clamped = Math.max(0.05, Math.min(32, Number(speed) || 1));

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

  /**
   * Draw a deck's canvas onto ctx with mirror/tile/chroma applied.
   * Assumes ctx.globalAlpha, ctx.filter, ctx.globalCompositeOperation
   * are already set by the caller.
   */
  _drawDeck(
    ctx,
    srcCanvas,
    mirror,
    tileMode,
    zx,
    zy,
    zw,
    zh,
    w,
    h,
    posX,
    posY,
    deckScale,
    chroma
  ) {
    // Apply per-deck position and scale around the canvas center
    const hasTransform =
      (posX !== 0 || posY !== 0 || deckScale !== 1) && posX !== undefined;

    if (hasTransform) {
      ctx.save();
      ctx.translate(w / 2 + posX * w * 0.5, h / 2 + posY * h * 0.5);
      ctx.scale(deckScale, deckScale);
      ctx.translate(-w / 2, -h / 2);
    }

    if (!tileMode) {
      // Simple draw with optional mirror
      if (mirror) {
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(srcCanvas, zx, zy, zw, zh);
        ctx.restore();
      } else {
        ctx.drawImage(srcCanvas, zx, zy, zw, zh);
      }

      if (hasTransform) {
        ctx.restore();
      }

      return;
    }

    const hw = w / 2;
    const hh = h / 2;

    if (tileMode === "2x2") {
      // Four copies at quarter canvas size
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          if (mirror) {
            ctx.save();
            ctx.translate(col === 0 ? hw : w, row * hh);
            ctx.scale(-1, 1);
            ctx.drawImage(srcCanvas, 0, 0, hw, hh);
            ctx.restore();
          } else {
            ctx.drawImage(srcCanvas, col * hw, row * hh, hw, hh);
          }
        }
      }

      return;
    }

    if (tileMode === "mirror4") {
      // Quad mirror: each quadrant reflects its neighbour
      // Top-left: normal
      ctx.drawImage(srcCanvas, 0, 0, hw, hh);
      // Top-right: horizontal flip
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(srcCanvas, 0, 0, hw, hh);
      ctx.restore();
      // Bottom-left: vertical flip
      ctx.save();
      ctx.translate(0, h);
      ctx.scale(1, -1);
      ctx.drawImage(srcCanvas, 0, 0, hw, hh);
      ctx.restore();
      // Bottom-right: both flips
      ctx.save();
      ctx.translate(w, h);
      ctx.scale(-1, -1);
      ctx.drawImage(srcCanvas, 0, 0, hw, hh);
      ctx.restore();
    }

    if (hasTransform) {
      ctx.restore();
    }

    // Chromatic aberration: two offset layers (red left, cyan right) via screen blend
    if (chroma > 0) {
      const ca = ctx.globalAlpha;
      const chromaAlpha = ca * 0.55;
      // Red fringe — shift left
      ctx.save();
      ctx.globalAlpha = chromaAlpha;
      ctx.globalCompositeOperation = "screen";
      ctx.filter = "hue-rotate(0deg) saturate(5) brightness(0.45)";
      ctx.drawImage(srcCanvas, zx - chroma, zy, zw, zh);
      ctx.restore();
      // Cyan fringe — shift right
      ctx.save();
      ctx.globalAlpha = chromaAlpha;
      ctx.globalCompositeOperation = "screen";
      ctx.filter = "hue-rotate(180deg) saturate(5) brightness(0.45)";
      ctx.drawImage(srcCanvas, zx + chroma, zy, zw, zh);
      ctx.restore();
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

    // Compositing canvas (A+B blend, trail, blackout, etc.)
    this._canvas = document.createElement("canvas");
    this._canvas.width = 1280;
    this._canvas.height = 720;
    this._ctx = this._canvas.getContext("2d");

    // Final output canvas — master FX (contrast/saturation/hue) applied here
    this._outCanvas = document.createElement("canvas");
    this._outCanvas.width = 1280;
    this._outCanvas.height = 720;
    this._outCtx = this._outCanvas.getContext("2d");

    // Capture stream from output canvas so master FX are included
    const stream = this._outCanvas.captureStream(60);
    this._stream = stream;
    const [track] = stream.getVideoTracks();
    this._track = track || null;

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

    // Re-attach imageCapture if modV is now available but wasn't at start()
    if (this._track && this.modV && !this.modV._imageCapture) {
      this.modV._imageCapture = new ImageCapture(this._track);
      this._ensureVideoClipModule();
    }

    const cf = store.state["clip-launcher"]?.crossfader ?? 0.5;
    const ctx = this._ctx;
    const w = this._canvas.width;
    const h = this._canvas.height;
    const mode = this.blendMode;

    // Trail feedback: keep previous frame ghosted rather than clearing
    if (this.trailEnabled) {
      ctx.globalAlpha = 1 - this.trailDecay;
      ctx.filter = "none";
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    // Beat-reactive flash + zoom: detect rising edge on beats.kick
    const kick = Boolean(window.modV?.store?.state?.beats?.kick);
    const risingEdge = kick && !this._lastKick;
    this._lastKick = kick;

    if (this.beatFlashEnabled) {
      if (risingEdge) {
        this._kickFlash = 1.0;
      }

      this._kickFlash *= 0.82; // exponential decay (~10 frames to near-zero at 60fps)
    } else {
      this._kickFlash = 0;
    }

    if (this.beatZoomEnabled) {
      if (risingEdge) {
        this._zoomScale = 1.0;
      }

      this._zoomScale *= 0.78; // slightly faster decay for snappy zoom
    } else {
      this._zoomScale = 0;
    }

    const flashBoost = this._kickFlash * this.beatFlashIntensity;
    const zoomDelta = this._zoomScale * this.beatZoomIntensity; // e.g. 0.06

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
        : mode === "difference"
        ? "difference"
        : mode === "exclusion"
        ? "exclusion"
        : mode === "hard-light"
        ? "hard-light"
        : mode === "soft-light"
        ? "soft-light"
        : mode === "darken"
        ? "darken"
        : mode === "lighten"
        ? "lighten"
        : "source-over"; // cross uses source-over

    // Strobe gating: when enabled, blank output on the "off" half of each cycle
    const strobeOn =
      !this.strobeEnabled ||
      Math.floor((performance.now() * this.strobeHz) / 500) % 2 === 0;

    // Compute scaled draw region for beat zoom (centered)
    const scale = 1 + zoomDelta;
    const zx = (w - w * scale) / 2;
    const zy = (h - h * scale) / 2;
    const zw = w * scale;
    const zh = h * scale;

    if (
      strobeOn &&
      this.playerA.canvas &&
      this.playerA.isPlaying &&
      alphaA > 0.001
    ) {
      ctx.globalAlpha = alphaA;
      ctx.filter = filterA;
      ctx.globalCompositeOperation = "source-over";
      this._drawDeck(
        ctx,
        this.playerA.canvas,
        this.mirrorA,
        this.tileModeA,
        zx,
        zy,
        zw,
        zh,
        w,
        h,
        this._posXA,
        this._posYA,
        this._scaleA,
        this._chromaA
      );
    }

    if (
      strobeOn &&
      this.playerB.canvas &&
      this.playerB.isPlaying &&
      alphaB > 0.001
    ) {
      ctx.globalAlpha = alphaB;
      ctx.filter = filterB;
      ctx.globalCompositeOperation =
        mode === "cross" ? "source-over" : compositeOp;
      this._drawDeck(
        ctx,
        this.playerB.canvas,
        this.mirrorB,
        this.tileModeB,
        zx,
        zy,
        zw,
        zh,
        w,
        h,
        this._posXB,
        this._posYB,
        this._scaleB,
        this._chromaB
      );
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

    // Animate whiteout
    const whiteDiff = this._targetMasterWhite - this._masterWhite;

    if (Math.abs(whiteDiff) > 0.002) {
      this._masterWhite += whiteDiff * 0.15;
    } else {
      this._masterWhite = this._targetMasterWhite;
    }

    if (this._masterWhite > 0.001) {
      ctx.globalAlpha = this._masterWhite;
      ctx.filter = "none";
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
    }

    // Master brightness: dim or boost the whole output
    if (this._masterBrightness < 0.999) {
      ctx.globalAlpha = 1 - this._masterBrightness;
      ctx.filter = "none";
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
    } else if (this._masterBrightness > 1.001) {
      ctx.globalAlpha = this._masterBrightness - 1;
      ctx.filter = "none";
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
    }

    ctx.globalAlpha = 1;
    ctx.filter = "none";
    ctx.globalCompositeOperation = "source-over";

    // Continuous hue spin
    if (this._masterHueSpin !== 0) {
      this._masterHue =
        (((this._masterHue + this._masterHueSpin / 60) % 360) + 360) % 360;
    }

    // Master output FX pass: composite canvas → output canvas with CSS filter
    if (this._outCtx) {
      const outCtx = this._outCtx;
      const masterFilter = this._buildMasterFilter();
      outCtx.clearRect(0, 0, w, h);
      outCtx.globalAlpha = 1;
      outCtx.globalCompositeOperation = "source-over";
      outCtx.filter = masterFilter;
      outCtx.drawImage(this._canvas, 0, 0);
      outCtx.filter = "none";
    }

    this._raf = requestAnimationFrame(() => this._loop());
  }

  stop() {
    this._active = false;

    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }

    if (this._mediaRecorder && this._mediaRecorder.state !== "inactive") {
      this._mediaRecorder.stop();
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
    this._outCanvas = null;
    this._outCtx = null;
    this._track = null;

    if (this.modV) {
      this.modV._imageCapture = null;
    }
  }

  /** Output canvas (post-master-FX) — used for preview rendering in the UI. */
  get canvas() {
    return this._outCanvas || this._canvas;
  }

  get isRecording() {
    return (
      this._mediaRecorder !== null && this._mediaRecorder.state === "recording"
    );
  }

  setStrobe(enabled, hz) {
    this.strobeEnabled = Boolean(enabled);

    if (hz !== undefined) {
      this.strobeHz = Math.max(0.5, Math.min(60, Number(hz) || 8));
    }
  }

  setMasterFx({ contrast, saturation, hue } = {}) {
    if (contrast !== undefined) {
      this._masterContrast = Math.max(0, Math.min(4, Number(contrast) || 1));
    }

    if (saturation !== undefined) {
      this._masterSaturation = Math.max(
        0,
        Math.min(4, Number(saturation) || 1)
      );
    }

    if (hue !== undefined) {
      this._masterHue = Number(hue) % 360;
    }
  }

  getMasterFx() {
    return {
      contrast: this._masterContrast,
      saturation: this._masterSaturation,
      hue: this._masterHue,
    };
  }

  _buildMasterFilter() {
    const parts = [];

    if (this._masterContrast !== 1.0) {
      parts.push(`contrast(${this._masterContrast.toFixed(2)})`);
    }

    if (this._masterSaturation !== 1.0) {
      parts.push(`saturate(${this._masterSaturation.toFixed(2)})`);
    }

    if (this._masterHue !== 0) {
      parts.push(`hue-rotate(${Math.round(this._masterHue)}deg)`);
    }

    return parts.length > 0 ? parts.join(" ") : "none";
  }

  startRecording() {
    if (!this._stream || this.isRecording) {
      return;
    }

    this._recordChunks = [];
    this._recordingStartTime = Date.now();

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const recorder = new MediaRecorder(this._stream, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this._recordChunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(this._recordChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
        2,
        "0"
      )}${String(now.getDate()).padStart(2, "0")}-${String(
        now.getHours()
      ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
        now.getSeconds()
      ).padStart(2, "0")}`;
      a.download = `grackle-${ts}.webm`;
      a.href = url;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      this._recordChunks = [];
      this._mediaRecorder = null;
    };

    recorder.start(100); // collect in 100ms chunks
    this._mediaRecorder = recorder;
  }

  stopRecording() {
    if (this._mediaRecorder && this._mediaRecorder.state === "recording") {
      this._mediaRecorder.stop();
    }
  }

  getRecordingElapsedMs() {
    if (!this.isRecording) {
      return 0;
    }

    return Date.now() - this._recordingStartTime;
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
