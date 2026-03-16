const STORAGE_KEY = "grackle-midi-bindings-v1";

function loadPersistedBindings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function initialState() {
  return {
    bindings: loadPersistedBindings(),
  };
}

function persistState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.bindings));
  } catch (_error) {
    // Storage failures are non-fatal.
  }
}

const mutations = {
  SET_BINDING(state, { key, deck, row, col }) {
    state.bindings[key] = { deck, row, col };
    persistState(state);
  },

  REMOVE_BINDING(state, key) {
    delete state.bindings[key];
    persistState(state);
  },

  CLEAR_ALL(state) {
    state.bindings = {};
    persistState(state);
  },
};

export default {
  namespaced: true,
  state: initialState,
  mutations,
};
