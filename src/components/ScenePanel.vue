<template>
  <section class="scene-panel">
    <div class="scene-row">
      <button
        type="button"
        class="scene-save"
        :disabled="scenes.length >= maxScenes"
        @click="createScene"
      >
        [+ SAVE]
      </button>

      <div
        v-for="scene in scenes"
        :key="scene.id"
        class="scene-slot"
        :class="{ active: scene.id === activeSceneId }"
      >
        <button
          v-if="editingSceneId !== scene.id"
          type="button"
          class="scene-button"
          @click="handleSceneClick(scene)"
          @dblclick.stop="startEditing(scene)"
          @mousedown="startLongPress(scene, $event)"
          @mouseup="endLongPress(scene)"
          @mouseleave="cancelLongPress"
          @touchstart.prevent="startLongPress(scene, $event)"
          @touchend.prevent="endLongPress(scene)"
          @touchcancel.prevent="cancelLongPress"
        >
          <span class="scene-name">{{ scene.name }}</span>
        </button>

        <input
          v-else
          :ref="`scene-input-${scene.id}`"
          v-model.trim="editingName"
          class="scene-input"
          maxlength="24"
          @blur="finishEditing(scene)"
          @click.stop
          @keydown.enter.prevent="finishEditing(scene)"
          @keydown.esc.prevent="cancelEditing"
        />

        <button
          type="button"
          class="scene-delete"
          @click.stop="deleteScene(scene.id)"
        >
          ×
        </button>
      </div>
    </div>
  </section>
</template>

<script>
import clipLauncher from "@/media-manager/ClipLauncher";

const DECKS = ["A", "B"];
const GRID_SIZE = 8;
const LONG_PRESS_MS = 380;
const MAX_SCENES = 8;

function createSceneId() {
  return `scene-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function serializeSlot(slot) {
  return {
    source: slot.source?.name
      ? {
          name: slot.source.name,
        }
      : null,
    loopMode: slot.loopMode,
    speed: slot.speed,
  };
}

export default {
  name: "ScenePanel",

  data() {
    return {
      editingSceneId: null,
      editingName: "",
      longPress: {
        timer: null,
        triggered: false,
      },
      maxScenes: MAX_SCENES,
    };
  },

  computed: {
    scenes() {
      return this.$store.state["clip-launcher-scenes"].scenes.slice(
        0,
        MAX_SCENES
      );
    },

    activeSceneId() {
      return this.$store.state["clip-launcher-scenes"].activeSceneId;
    },
  },

  beforeDestroy() {
    this.cancelLongPress();
  },

  methods: {
    nextSceneName() {
      let max = 0;

      for (let i = 0; i < this.scenes.length; i++) {
        const match = /^Scene (\d+)$/i.exec(this.scenes[i].name);

        if (match) {
          max = Math.max(max, Number(match[1]));
        }
      }

      return `Scene ${max + 1}`;
    },

    serializeDecks() {
      const decks = this.$store.state["clip-launcher"].decks;
      const out = {};

      for (let i = 0; i < DECKS.length; i++) {
        const deck = DECKS[i];
        out[deck] = decks[deck].map((row) =>
          row.map((slot) => serializeSlot(slot))
        );
      }

      return out;
    },

    saveScene(id, name) {
      const trimmedName = (name || "").trim() || this.nextSceneName();
      const crossfader = this.$store.state["clip-launcher"].crossfader;

      this.$store.commit("clip-launcher-scenes/SAVE_SCENE", {
        id,
        name: trimmedName,
        decks: this.serializeDecks(),
        crossfader,
      });
      this.$store.commit("clip-launcher-scenes/SET_ACTIVE_SCENE", id);
    },

    createScene() {
      if (this.scenes.length >= MAX_SCENES) {
        return;
      }

      const id = createSceneId();

      this.saveScene(id, this.nextSceneName());
    },

    async loadScene(scene) {
      for (let deckIndex = 0; deckIndex < DECKS.length; deckIndex++) {
        const deck = DECKS[deckIndex];
        const sceneDeck = scene.decks?.[deck] || [];

        for (let row = 0; row < GRID_SIZE; row++) {
          const sceneRow = sceneDeck[row] || [];

          for (let col = 0; col < GRID_SIZE; col++) {
            const slot = sceneRow[col] || null;

            if (slot?.source?.name) {
              await clipLauncher.loadClip(deck, row, col, {
                name: slot.source.name,
              });
            } else {
              clipLauncher.clearSlot(deck, row, col);
            }

            clipLauncher.updateSlotSettings(deck, row, col, {
              loopMode: slot?.loopMode,
              speed: slot?.speed,
            });
          }
        }
      }

      clipLauncher.setCrossfader(scene.crossfader);
      this.$store.commit("clip-launcher-scenes/SET_ACTIVE_SCENE", scene.id);
    },

    handleSceneClick(scene) {
      if (this.longPress.triggered) {
        return;
      }

      this.loadScene(scene);
    },

    startLongPress(scene) {
      this.cancelLongPress();
      this.longPress.triggered = false;
      this.longPress.timer = setTimeout(() => {
        this.longPress.triggered = true;
        this.saveScene(scene.id, scene.name);
      }, LONG_PRESS_MS);
    },

    endLongPress(scene) {
      const wasTriggered = this.longPress.triggered;

      this.cancelLongPress();

      if (!wasTriggered) {
        this.loadScene(scene);
      }
    },

    cancelLongPress() {
      if (this.longPress.timer) {
        clearTimeout(this.longPress.timer);
        this.longPress.timer = null;
      }

      this.longPress.triggered = false;
    },

    deleteScene(id) {
      this.cancelEditing();
      this.$store.commit("clip-launcher-scenes/DELETE_SCENE", id);
    },

    startEditing(scene) {
      this.cancelLongPress();
      this.editingSceneId = scene.id;
      this.editingName = scene.name;
      this.$nextTick(() => {
        const inputRef = this.$refs[`scene-input-${scene.id}`];
        const input = Array.isArray(inputRef) ? inputRef[0] : inputRef;

        if (input) {
          input.focus();
          input.select();
        }
      });
    },

    finishEditing(scene) {
      const name = this.editingName.trim() || scene.name;

      this.$store.commit("clip-launcher-scenes/RENAME_SCENE", {
        id: scene.id,
        name,
      });
      this.cancelEditing();
    },

    cancelEditing() {
      this.editingSceneId = null;
      this.editingName = "";
    },
  },
};
</script>

<style scoped>
.scene-panel {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 8px;
  background: #1a1d24;
  box-sizing: border-box;
}

.scene-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}

.scene-save,
.scene-button,
.scene-input {
  min-width: 112px;
  height: 38px;
  padding: 0 12px;
  background: #24272f;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.72rem;
  font-family: "SFMono-Regular", "Menlo", "Monaco", monospace;
  line-height: 1;
  box-sizing: border-box;
}

.scene-save,
.scene-button {
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease, color 120ms ease;
}

.scene-save:hover,
.scene-button:hover {
  border-color: rgba(255, 255, 255, 0.22);
}

.scene-save:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.scene-slot {
  position: relative;
  flex: 0 0 auto;
}

.scene-slot.active .scene-button,
.scene-slot.active .scene-input {
  border-color: var(--accent-color, #00ff88);
  box-shadow: 0 0 0 1px rgba(0, 255, 136, 0.14);
  color: var(--accent-color, #00ff88);
}

.scene-button {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 112px;
  text-align: left;
}

.scene-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scene-input {
  outline: none;
}

.scene-input:focus {
  border-color: #7c3aff;
  box-shadow: 0 0 0 1px rgba(124, 58, 255, 0.18);
}

.scene-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.46);
  color: rgba(255, 255, 255, 0.74);
  font-size: 0.72rem;
  line-height: 1;
  opacity: 0;
  cursor: pointer;
  transition: opacity 120ms ease, color 120ms ease;
}

.scene-slot:hover .scene-delete {
  opacity: 1;
}

.scene-delete:hover {
  color: #fff;
}
</style>
