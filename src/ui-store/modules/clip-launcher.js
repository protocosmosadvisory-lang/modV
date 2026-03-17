const DECKS = ["A", "B"];
const GRID_SIZE = 8;
const STORAGE_KEY = "grackle-clip-launcher-v1";
const LOOP_MODES = ["loop", "ping-pong", "once", "hold"];

function createSlot(deck, row, col) {
  return {
    id: `${deck}-${row}-${col}`,
    source: null,
    thumbnail: null,
    loopMode: "loop",
    speed: 1.0,
    bpmSyncBeats: 0, // 0=off; 1/2/4/8 = loop in that many beats at master BPM
    active: false,
  };
}

function createDeck(deck) {
  const slots = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    const cols = [];

    for (let col = 0; col < GRID_SIZE; col++) {
      cols.push(createSlot(deck, row, col));
    }

    slots.push(cols);
  }

  return slots;
}

function serializeDecks(decks) {
  const out = {};

  const deckKeys = DECKS;
  for (let i = 0, len = deckKeys.length; i < len; i++) {
    const deck = deckKeys[i];

    out[deck] = decks[deck].map((row) =>
      row.map((slot) => ({
        source: slot.source
          ? {
              name: slot.source.name,
              path: slot.source.path,
              url: slot.source.url,
              duration: slot.source.duration || 0,
            }
          : null,
        loopMode: slot.loopMode,
        speed: slot.speed,
        bpmSyncBeats: slot.bpmSyncBeats || 0,
      }))
    );
  }

  return out;
}

function rehydrateState(saved) {
  const state = {
    decks: {
      A: createDeck("A"),
      B: createDeck("B"),
    },
    crossfader: typeof saved.crossfader === "number" ? saved.crossfader : 0.5,
  };

  const deckKeys = DECKS;
  for (let i = 0, len = deckKeys.length; i < len; i++) {
    const deck = deckKeys[i];

    const savedDeck = saved.decks && saved.decks[deck];

    if (!savedDeck) {
      continue;
    }

    for (let row = 0; row < GRID_SIZE; row++) {
      const savedRow = savedDeck[row];

      if (!savedRow) {
        continue;
      }

      for (let col = 0; col < GRID_SIZE; col++) {
        const savedSlot = savedRow[col];

        if (!savedSlot) {
          continue;
        }

        const slot = state.decks[deck][row][col];

        if (savedSlot.source) {
          slot.source = savedSlot.source;
        }

        if (savedSlot.loopMode && LOOP_MODES.includes(savedSlot.loopMode)) {
          slot.loopMode = savedSlot.loopMode;
        }

        if (typeof savedSlot.speed === "number" && isFinite(savedSlot.speed)) {
          slot.speed = Math.max(0.1, Math.min(16, savedSlot.speed));
        }

        if ([0, 1, 2, 4, 8].includes(savedSlot.bpmSyncBeats)) {
          slot.bpmSyncBeats = savedSlot.bpmSyncBeats;
        }

        if (savedSlot.source && typeof savedSlot.source.duration === "number") {
          slot.source = { ...slot.source, duration: savedSlot.source.duration };
        }
      }
    }
  }

  return state;
}

function loadPersistedState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch (_e) {
    return null;
  }
}

function initialState() {
  const saved = loadPersistedState();

  if (saved) {
    return rehydrateState(saved);
  }

  return {
    decks: {
      A: createDeck("A"),
      B: createDeck("B"),
    },
    crossfader: 0.5,
  };
}

function persistState(state) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        decks: serializeDecks(state.decks),
        crossfader: state.crossfader,
      })
    );
  } catch (_e) {
    // Storage quota exceeded — non-fatal
  }
}

function normalizeDeck(deck) {
  const normalizedDeck = String(deck).toUpperCase();

  if (DECKS.indexOf(normalizedDeck) < 0) {
    throw new Error(`Invalid deck "${deck}"`);
  }

  return normalizedDeck;
}

function getSlot(state, deck, row, col) {
  const normalizedDeck = normalizeDeck(deck);
  const targetRow = state.decks[normalizedDeck]?.[row];
  const slot = targetRow?.[col];

  if (!slot) {
    throw new Error(
      `Invalid clip slot "${normalizedDeck}" at row ${row}, col ${col}`
    );
  }

  return { normalizedDeck, slot };
}

const getters = {
  deckWeightA: (state) => 1 - state.crossfader,
  deckWeightB: (state) => state.crossfader,
  activeSlot: (state) => (deck) => {
    const targetDeck = state.decks[normalizeDeck(deck)];

    for (let row = 0; row < targetDeck.length; row++) {
      for (let col = 0; col < targetDeck[row].length; col++) {
        if (targetDeck[row][col].active) {
          return targetDeck[row][col];
        }
      }
    }

    return null;
  },
};

const mutations = {
  LOAD_CLIP(state, { deck, row, col, source, thumbnail = null }) {
    const { slot } = getSlot(state, deck, row, col);

    slot.source = source;
    slot.thumbnail = thumbnail;
    slot.active = false;
    persistState(state);
  },

  TRIGGER_CLIP(state, { deck, row, col }) {
    const normalizedDeck = normalizeDeck(deck);
    const targetDeck = state.decks[normalizedDeck];

    for (let rowIndex = 0; rowIndex < targetDeck.length; rowIndex++) {
      const targetRow = targetDeck[rowIndex];

      for (let colIndex = 0; colIndex < targetRow.length; colIndex++) {
        targetRow[colIndex].active = rowIndex === row && colIndex === col;
      }
    }
  },

  CLEAR_SLOT(state, { deck, row, col }) {
    const { normalizedDeck, slot } = getSlot(state, deck, row, col);
    const freshSlot = createSlot(normalizedDeck, row, col);

    state.decks[normalizedDeck][row][col] = { ...freshSlot, id: slot.id };
    persistState(state);
  },

  UPDATE_SLOT_SETTINGS(
    state,
    { deck, row, col, loopMode, speed, bpmSyncBeats }
  ) {
    const { slot } = getSlot(state, deck, row, col);

    if (loopMode !== undefined && LOOP_MODES.includes(loopMode)) {
      slot.loopMode = loopMode;
    }

    if (speed !== undefined) {
      const numSpeed = Number(speed);

      if (isFinite(numSpeed)) {
        slot.speed = Math.max(0.1, Math.min(16, numSpeed));
      }
    }

    if (bpmSyncBeats !== undefined) {
      const beats = Number(bpmSyncBeats);
      slot.bpmSyncBeats = [0, 1, 2, 4, 8].includes(beats) ? beats : 0;
    }

    persistState(state);
  },

  SET_CROSSFADER(state, value) {
    state.crossfader = Math.min(1, Math.max(0, Number(value)));
    persistState(state);
  },
};

export default {
  namespaced: true,
  state: initialState,
  getters,
  mutations,
};
