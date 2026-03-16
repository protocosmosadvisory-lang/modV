import store from "../ui-store";

const DECKS = ["A", "B"];
const SUPPORTED_EXTENSIONS = [".mp4", ".mov"];

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

  loadClip(deck, row, col, source) {
    const normalizedDeck = normalizeDeck(deck);
    const normalizedSource = normalizeSource(source);

    store.commit("clip-launcher/LOAD_CLIP", {
      deck: normalizedDeck,
      row,
      col,
      source: normalizedSource,
    });

    return this.getSlot(normalizedDeck, row, col);
  }

  triggerClip(deck, row, col) {
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

    const activeSlot = this.getSlot(normalizedDeck, row, col);
    this.emit("clip-triggered", {
      deck: normalizedDeck,
      row,
      col,
      slot: activeSlot,
    });

    return activeSlot;
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

  isSupportedFile(file) {
    const name = file?.name?.toLowerCase() || "";

    return SUPPORTED_EXTENSIONS.some((extension) => name.endsWith(extension));
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
