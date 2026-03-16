const STORAGE_KEY = "grackle-scenes-v1";

function loadPersistedScenes() {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function persistScenes(scenes) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes));
  } catch (_error) {
    // Storage quota exceeded or unavailable.
  }
}

function initialState() {
  return {
    scenes: loadPersistedScenes(),
    activeSceneId: null,
  };
}

function persistAfterMutation(state) {
  persistScenes(state.scenes);
}

export default {
  namespaced: true,

  state: initialState,

  mutations: {
    SAVE_SCENE(state, { id, name, decks, crossfader }) {
      const index = state.scenes.findIndex((scene) => scene.id === id);
      const nextScene = {
        id,
        name,
        decks,
        crossfader,
      };

      if (index >= 0) {
        state.scenes.splice(index, 1, nextScene);
      } else {
        state.scenes.push(nextScene);
      }

      persistAfterMutation(state);
    },

    DELETE_SCENE(state, id) {
      state.scenes = state.scenes.filter((scene) => scene.id !== id);

      if (state.activeSceneId === id) {
        state.activeSceneId = null;
      }

      persistAfterMutation(state);
    },

    SET_ACTIVE_SCENE(state, id) {
      state.activeSceneId = id;
      persistAfterMutation(state);
    },

    RENAME_SCENE(state, { id, name }) {
      const scene = state.scenes.find((entry) => entry.id === id);

      if (scene) {
        scene.name = name;
      }

      persistAfterMutation(state);
    },
  },
};
