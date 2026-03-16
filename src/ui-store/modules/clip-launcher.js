const DECKS = ["A", "B"];
const GRID_SIZE = 8;

function createSlot(deck, row, col) {
  return {
    id: `${deck}-${row}-${col}`,
    source: null,
    thumbnail: null,
    loopMode: "loop",
    speed: 1.0,
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

function initialState() {
  return {
    decks: {
      A: createDeck("A"),
      B: createDeck("B"),
    },
    crossfader: 0.5,
  };
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
  },

  SET_CROSSFADER(state, value) {
    state.crossfader = Math.min(1, Math.max(0, Number(value)));
  },
};

export default {
  namespaced: true,
  state: initialState,
  getters,
  mutations,
};
