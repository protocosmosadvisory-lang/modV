import store from "../ui-store";
import videoClipPlayer from "../application/VideoClipPlayer";
import BeatSync from "../application/BeatSync";

const DECKS = ["A", "B"];
const SUPPORTED_EXTENSIONS = [".mp4", ".mov", ".webm"];
const THUMBNAIL_WIDTH = 160;
const THUMBNAIL_HEIGHT = 90;

function normalizeDeck(deck) {
  const normalizedDeck = String(deck).toUpperCase();

  if (DECKS.indexOf(normalizedDeck) < 0) {
    throw new Error(`Invalid deck "${deck}"`);
  }

  return normalizedDeck;
}

function normalizeSource(source) {
  if (!source) {
    throw new Error("Missing clip source");
  }

  if (typeof source === "string") {
    return {
      name: source.split(/[\\/]/).pop(),
      path: source,
      url: source,
    };
  }

  const path = source.path || source.name || "";
  const name = source.name || path.split(/[\\/]/).pop();
  const url =
    source.url ||
    source.objectURL ||
    (typeof URL !== "undefined" &&
    typeof File !== "undefined" &&
    typeof URL.createObjectURL === "function" &&
    source instanceof File
      ? URL.createObjectURL(source)
      : null);

  return {
    ...source,
    name,
    path,
    url,
  };
}

class ClipLauncher {
  listeners = {};
  // Per-slot load tokens to prevent stale thumbnail writes from async races
  _loadTokens = {};
  beatSyncMode = "free";

  _slotKey(deck, row, col) {
    return `${deck}-${row}-${col}`;
  }

  get state() {
    return store.state["clip-launcher"];
  }

  getDeck(deck) {
    return this.state.decks[normalizeDeck(deck)];
  }

  getSlot(deck, row, col) {
    const normalizedDeck = normalizeDeck(deck);
    const slot = this.state.decks[normalizedDeck]?.[row]?.[col];

    if (!slot) {
      throw new Error(
        `Invalid clip slot "${normalizedDeck}" at row ${row}, col ${col}`
      );
    }

    return slot;
  }

  async loadClip(deck, row, col, source) {
    const normalizedDeck = normalizeDeck(deck);
    const normalizedSource = normalizeSource(source);
    const slotKey = this._slotKey(normalizedDeck, row, col);
    const token = (this._loadTokens[slotKey] =
      (this._loadTokens[slotKey] || 0) + 1);
    let thumbnail = null;

    if (
      typeof File !== "undefined" &&
      source instanceof File &&
      this.isSupportedFile(source)
    ) {
      thumbnail = await this.generateThumbnail(source);
    }

    // Abort if a newer load started while we were generating the thumbnail
    if (this._loadTokens[slotKey] !== token) {
      return null;
    }

    store.commit("clip-launcher/LOAD_CLIP", {
      deck: normalizedDeck,
      row,
      col,
      source: normalizedSource,
      thumbnail,
    });

    const slot = this.getSlot(normalizedDeck, row, col);

    this.emit("clip-loaded", {
      deck: normalizedDeck,
      row,
      col,
      slot,
    });

    return slot;
  }

  _triggerClipNow(deck, row, col) {
    const normalizedDeck = normalizeDeck(deck);
    const slot = this.getSlot(normalizedDeck, row, col);

    if (!slot.source) {
      return null;
    }

    store.commit("clip-launcher/TRIGGER_CLIP", {
      deck: normalizedDeck,
      row,
      col,
    });

    // Route the video source through modV's render pipeline
    videoClipPlayer.play(slot.source, {
      loopMode: slot.loopMode || "loop",
      speed: slot.speed || 1.0,
    });

    const activeSlot = this.getSlot(normalizedDeck, row, col);
    this.emit("clip-triggered", {
      deck: normalizedDeck,
      row,
      col,
      slot: activeSlot,
    });

    return activeSlot;
  }

  triggerClip(deck, row, col) {
    const normalizedDeck = normalizeDeck(deck);
    const slot = this.getSlot(normalizedDeck, row, col);

    if (!slot.source) {
      return this.beatSyncMode === "sync" ? Promise.resolve(null) : null;
    }

    if (this.beatSyncMode === "sync") {
      return BeatSync.queueTrigger(normalizedDeck, row, col).then(() =>
        this._triggerClipNow(normalizedDeck, row, col)
      );
    }

    return this._triggerClipNow(normalizedDeck, row, col);
  }

  clearSlot(deck, row, col) {
    const normalizedDeck = normalizeDeck(deck);
    const slot = this.getSlot(normalizedDeck, row, col);

    store.commit("clip-launcher/CLEAR_SLOT", {
      deck: normalizedDeck,
      row,
      col,
    });

    this.emit("clip-cleared", {
      deck: normalizedDeck,
      row,
      col,
      slot,
    });
  }

  setCrossfader(value) {
    store.commit("clip-launcher/SET_CROSSFADER", value);
    this.emit("deck-crossfade", this.state.crossfader);

    return this.state.crossfader;
  }

  setBeatSyncMode(mode) {
    if (mode !== "free" && mode !== "sync") {
      throw new Error(`Invalid beat sync mode "${mode}"`);
    }

    this.beatSyncMode = mode;
    this.emit("beat-sync-mode-changed", this.beatSyncMode);

    return this.beatSyncMode;
  }

  isSupportedFile(file) {
    const name = file?.name?.toLowerCase() || "";
    const hasValidExtension = SUPPORTED_EXTENSIONS.some((ext) =>
      name.endsWith(ext)
    );
    // Also check MIME type when available to prevent extension-spoofing
    const mime = file?.type || "";
    const hasValidMime = !mime || mime.startsWith("video/");

    return hasValidExtension && hasValidMime;
  }

  generateThumbnail(file) {
    return new Promise((resolve) => {
      if (
        typeof document === "undefined" ||
        typeof URL === "undefined" ||
        typeof URL.createObjectURL !== "function" ||
        typeof URL.revokeObjectURL !== "function"
      ) {
        resolve(null);
        return;
      }

      const objectURL = URL.createObjectURL(file);
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(objectURL);
        resolve(null);
        return;
      }

      canvas.width = THUMBNAIL_WIDTH;
      canvas.height = THUMBNAIL_HEIGHT;
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.style.display = "none";
      video.src = objectURL;

      let settled = false;

      const finalize = (thumbnail = null) => {
        if (settled) {
          return;
        }

        settled = true;
        video.pause();
        video.removeAttribute("src");
        video.load();
        URL.revokeObjectURL(objectURL);
        resolve(thumbnail);
      };

      video.addEventListener("error", () => finalize(null), { once: true });

      video.addEventListener(
        "loadedmetadata",
        () => {
          if (!Number.isFinite(video.duration) || video.duration <= 0) {
            finalize(null);
            return;
          }

          const targetTime = Math.max(
            0,
            Math.min(0.5, video.duration * 0.1, video.duration - 0.01)
          );

          if (targetTime === 0) {
            context.drawImage(video, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
            finalize(canvas.toDataURL("image/jpeg", 0.5));
            return;
          }

          video.currentTime = targetTime;
        },
        { once: true }
      );

      video.addEventListener(
        "seeked",
        () => {
          context.drawImage(video, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
          finalize(canvas.toDataURL("image/jpeg", 0.5));
        },
        { once: true }
      );
    });
  }

  on(eventName, listener) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }

    this.listeners[eventName].push(listener);

    return () => this.off(eventName, listener);
  }

  off(eventName, listener) {
    if (!this.listeners[eventName]) {
      return;
    }

    this.listeners[eventName] = this.listeners[eventName].filter(
      (entry) => entry !== listener
    );
  }

  emit(eventName, payload) {
    const listeners = this.listeners[eventName] || [];

    for (let i = 0; i < listeners.length; i++) {
      listeners[i](payload);
    }
  }
}

export default new ClipLauncher();
