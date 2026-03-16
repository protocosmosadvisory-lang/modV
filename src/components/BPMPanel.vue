<template>
  <section
    class="bpm-panel"
    tabindex="0"
    @keydown.space.prevent="handleSpaceTap"
  >
    <header class="bpm-panel__header">
      <span class="bpm-panel__label">Tempo</span>
      <Select v-model="bpmSource" class="bpm-panel__sourceSelect light">
        <option v-for="source in bpmSources" :key="source" :value="source">
          {{ source }}
        </option>
      </Select>
    </header>

    <div class="bpm-panel__main">
      <button
        v-if="!isEditingBpm"
        class="bpm-panel__display"
        type="button"
        @click="startEditingBpm"
      >
        <span class="bpm-panel__value">{{ displayBpm }}</span>
        <span class="bpm-panel__unit">BPM</span>
      </button>

      <TextInput
        v-else
        ref="bpmInput"
        v-model="editableBpm"
        class="bpm-panel__input"
        @blur="commitBpm"
        @keydown.enter.prevent="commitBpm"
        @keydown.esc.prevent="cancelEditingBpm"
      />

      <div
        class="bpm-panel__indicator"
        :class="{ 'bpm-panel__indicator-active': beatFlashActive }"
      ></div>
    </div>

    <Button
      class="bpm-panel__tapButton"
      :class="{
        light: bpmSource !== 'tap',
        'bpm-panel__tapButton-dimmed': bpmSource !== 'tap',
      }"
      @click="tap"
    >
      TAP
    </Button>

    <div class="bpm-panel__subdivisions">
      <button
        v-for="option in subdivisionOptions"
        :key="option.label"
        class="bpm-panel__subdivision"
        :class="{
          'bpm-panel__subdivision-active': subdivision === option.label,
        }"
        type="button"
        @click="setSubdivision(option.label)"
      >
        {{ option.label }}
      </button>
    </div>
  </section>
</template>

<script>
import Tt from "tap-tempo";

export default {
  data() {
    return {
      beatFlashActive: false,
      beatFlashTimeout: null,
      beatInterval: null,
      editableBpm: "",
      isEditingBpm: false,
      subdivision: "1/4",
      subdivisionInterval: null,
      subdivisionOptions: [
        { label: "1/1", denominator: 1 },
        { label: "1/2", denominator: 2 },
        { label: "1/4", denominator: 4 },
        { label: "1/8", denominator: 8 },
        { label: "1/16", denominator: 16 },
      ],
    };
  },

  created() {
    this.tapTempo = new Tt();
    this.handleTempo = (bpm) => {
      const roundedBpm = Math.round(bpm);

      if (!roundedBpm || this.bpm === roundedBpm) {
        return;
      }

      if (this.bpmSource !== "tap") {
        this.$modV.store.commit("beats/SET_BPM_SOURCE", { source: "tap" });
      }

      this.$modV.store.dispatch("beats/setBpm", {
        bpm: roundedBpm,
        source: "tap",
      });
    };

    this.tapTempo.on("tempo", this.handleTempo);
  },

  mounted() {
    this.restartBeatInterval();
    this.restartSubdivisionInterval();
  },

  beforeDestroy() {
    if (this.tapTempo && this.handleTempo) {
      if (this.tapTempo.off) {
        this.tapTempo.off("tempo", this.handleTempo);
      } else if (this.tapTempo.removeListener) {
        this.tapTempo.removeListener("tempo", this.handleTempo);
      }
    }

    this.clearBeatFlashTimeout();
    this.clearBeatInterval();
    this.clearSubdivisionInterval();
  },

  computed: {
    bpm() {
      return this.$modV.store.state.beats.bpm;
    },

    bpmSource: {
      get() {
        return this.$modV.store.state.beats.bpmSource;
      },

      set(source) {
        this.$modV.store.commit("beats/SET_BPM_SOURCE", { source });
      },
    },

    bpmSources() {
      return this.$modV.store.state.beats.bpmSources;
    },

    displayBpm() {
      return Math.round(this.bpm || 0);
    },

    subdivisionIntervalMs() {
      if (!this.bpm) {
        return 0;
      }

      const currentSubdivision = this.subdivisionOptions.find(
        (option) => option.label === this.subdivision
      );

      if (!currentSubdivision) {
        return 0;
      }

      return (60000 / this.bpm) * (4 / currentSubdivision.denominator);
    },
  },

  watch: {
    bpm() {
      this.restartBeatInterval();
      this.restartSubdivisionInterval();

      if (!this.isEditingBpm) {
        this.editableBpm = String(this.displayBpm);
      }
    },

    subdivision() {
      this.restartSubdivisionInterval();
    },
  },

  methods: {
    clearBeatFlashTimeout() {
      clearTimeout(this.beatFlashTimeout);
      this.beatFlashTimeout = null;
    },

    clearBeatInterval() {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    },

    clearSubdivisionInterval() {
      clearInterval(this.subdivisionInterval);
      this.subdivisionInterval = null;
    },

    commitBpm() {
      const bpm = Math.round(Number(this.editableBpm));

      this.isEditingBpm = false;
      this.editableBpm = String(this.displayBpm);

      if (!Number.isFinite(bpm) || bpm <= 0) {
        return;
      }

      this.$modV.store.dispatch("beats/setBpm", {
        bpm,
        source: this.bpmSource,
      });
    },

    cancelEditingBpm() {
      this.isEditingBpm = false;
      this.editableBpm = String(this.displayBpm);
    },

    emitSubdivisionBeat() {
      this.$emit("beat", {
        bpm: this.bpm,
        source: this.bpmSource,
        subdivision: this.subdivision,
      });
    },

    flashBeat() {
      this.beatFlashActive = true;
      this.clearBeatFlashTimeout();
      this.beatFlashTimeout = setTimeout(() => {
        this.beatFlashActive = false;
        this.beatFlashTimeout = null;
      }, 120);
    },

    handleSpaceTap(event) {
      const tagName = event.target && event.target.tagName;

      if (
        tagName === "INPUT" ||
        tagName === "SELECT" ||
        tagName === "BUTTON" ||
        this.isEditingBpm
      ) {
        return;
      }

      this.tap();
    },

    restartBeatInterval() {
      this.clearBeatInterval();

      if (!this.bpm) {
        return;
      }

      this.beatInterval = setInterval(() => {
        this.flashBeat();
      }, 60000 / this.bpm);
    },

    restartSubdivisionInterval() {
      this.clearSubdivisionInterval();

      if (!this.subdivisionIntervalMs) {
        return;
      }

      this.subdivisionInterval = setInterval(() => {
        this.emitSubdivisionBeat();
      }, this.subdivisionIntervalMs);
    },

    setSubdivision(label) {
      this.subdivision = label;
    },

    startEditingBpm() {
      this.isEditingBpm = true;
      this.editableBpm = String(this.displayBpm);

      this.$nextTick(() => {
        if (this.$refs.bpmInput && this.$refs.bpmInput.focus) {
          this.$refs.bpmInput.focus();
        }
      });
    },

    tap() {
      this.tapTempo.tap();
      this.flashBeat();
    },
  },
};
</script>

<style>
.bpm-panel {
  display: grid;
  gap: 18px;
  padding: 24px;
  background: radial-gradient(
      circle at top left,
      rgba(255, 106, 0, 0.24),
      transparent 42%
    ),
    linear-gradient(145deg, #181818, #080808 75%);
  border: 1px solid #2c2c2c;
  color: #f5f5f5;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
  outline: none;
}

.bpm-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.bpm-panel__label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #ff8c42;
}

.bpm-panel__sourceSelect {
  max-width: 180px;
}

.bpm-panel__sourceSelect select {
  height: 32px;
  background: #2a2a2a;
  color: #f5f5f5;
  text-transform: uppercase;
}

.bpm-panel__sourceSelect::before {
  height: 32px;
  width: 32px;
  background: #101010;
}

.bpm-panel__main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  align-items: center;
  gap: 16px;
}

.bpm-panel__display {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 0;
  background: transparent;
  border: none;
  color: inherit;
  cursor: text;
  text-align: left;
}

.bpm-panel__value {
  font-size: 64px;
  line-height: 0.9;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.bpm-panel__unit {
  padding-bottom: 10px;
  font-size: 14px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #9a9a9a;
}

.bpm-panel__input {
  width: 100%;
}

.bpm-panel__input input {
  height: 74px;
  padding: 0 12px;
  background: #f0f0f0;
  color: #111;
  font-size: 64px;
  font-weight: 800;
}

.bpm-panel__indicator {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #202020;
  border: 1px solid #454545;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
  transition: transform 80ms linear, background-color 80ms linear,
    box-shadow 80ms linear;
}

.bpm-panel__indicator-active {
  transform: scale(1.12);
  background: #00ffa3;
  box-shadow: 0 0 18px rgba(0, 255, 163, 0.65);
}

.bpm-panel__tapButton {
  min-height: 96px;
  background: linear-gradient(135deg, #ff5d00, #ffb000);
  color: #0c0c0c;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.24em;
}

.bpm-panel__tapButton-dimmed {
  opacity: 0.45;
}

.bpm-panel__subdivisions {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.bpm-panel__subdivision {
  min-height: 44px;
  border: 1px solid #303030;
  background: #111;
  color: #d7d7d7;
  font-size: 16px;
  font-weight: 700;
}

.bpm-panel__subdivision-active {
  background: #00b3ff;
  border-color: #00b3ff;
  color: #071018;
}

@media (max-width: 640px) {
  .bpm-panel {
    padding: 18px;
  }

  .bpm-panel__header,
  .bpm-panel__main {
    grid-template-columns: 1fr;
  }

  .bpm-panel__header {
    justify-content: stretch;
  }

  .bpm-panel__sourceSelect {
    max-width: none;
  }

  .bpm-panel__value {
    font-size: 52px;
  }

  .bpm-panel__input input {
    height: 60px;
    font-size: 52px;
  }

  .bpm-panel__indicator {
    width: 100%;
  }

  .bpm-panel__subdivisions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
