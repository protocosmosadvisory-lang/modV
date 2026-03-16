<template>
  <grid columns="4" class="status-bar tags">
    <c span="1+4" class="items">
      <StatusBarItem v-for="(item, itemName) in builtInItems" :key="itemName">
        <component :is="item"></component>
      </StatusBarItem>

      <!-- Launch output window -->
      <button
        type="button"
        class="output-launch-btn"
        :class="{ 'output-launch-active': outputWindowCount > 0 }"
        :title="
          outputWindowCount > 0
            ? `${outputWindowCount} output window(s) open`
            : 'Launch output window'
        "
        @click="launchOutput"
      >
        <span class="output-icon">⬛</span>
        <span>OUTPUT</span>
        <span v-if="outputWindowCount > 0" class="output-count">{{
          outputWindowCount
        }}</span>
      </button>

      <StatusBarItem class="version grackle-version">
        <span class="grackle-wordmark">GRACKLE</span>
        <span class="version-num">v{{ version }}</span>
      </StatusBarItem>
    </c>
  </grid>
</template>

<script>
import packageInfo from "../../../package.json";
import StatusBarItem from "./StatusBarItem";
import FPSDisplay from "./FPSDisplay";
import BPMDisplay from "./BPMDisplay";
import SizeDisplay from "./SizeDisplay";

export default {
  components: {
    StatusBarItem,
    FPSDisplay,
    BPMDisplay,
    SizeDisplay,
  },

  data() {
    return {
      builtInItems: ["FPSDisplay", "BPMDisplay", "SizeDisplay"],
      version: packageInfo.version,
    };
  },

  computed: {
    outputWindowCount() {
      const windows = this.$modV?.store?.state?.windows;

      if (!windows) {
        return 0;
      }

      return Object.keys(windows).length;
    },
  },

  methods: {
    async launchOutput() {
      if (!this.$modV) {
        return;
      }

      try {
        const id = await this.$modV.store.dispatch("windows/createWindow");

        // Try to go fullscreen on display 1 (projector)
        const displays = window.__electron_displays || [];
        const displayIndex = displays.length > 1 ? 1 : 0;

        this.$modV.store.commit("windows/UPDATE_WINDOW", {
          id,
          key: "displayIndex",
          value: displayIndex,
        });
      } catch (e) {
        console.warn("[StatusBar] Could not launch output window:", e);
      }
    },
  },
};
</script>

<style>
.status-bar {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  padding: 4px 8px;
  gap: 8px;
  background: #111318;
  border-top: 1px solid rgba(0, 255, 136, 0.1);
}

.status-bar.tags {
  margin: 0;
}

.status-bar:not(:last-child) {
  margin-bottom: 0;
}

.status-bar .tag {
  margin-bottom: 0;
}

.tags .tag:not(:last-child) {
  margin-right: 0.5rem;
}

.items {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.version {
  position: absolute;
  right: 8px;
}

.grackle-wordmark {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  color: var(--grackle-accent, #00ff88);
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.4);
}

.version-num {
  font-size: 0.62rem;
  color: rgba(255, 255, 255, 0.3);
  margin-left: 6px;
}

/* Output launch button */
.output-launch-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: background 100ms ease, border-color 100ms ease, color 100ms ease,
    box-shadow 100ms ease;
}

.output-launch-btn:hover {
  border-color: var(--grackle-accent, #00ff88);
  color: var(--grackle-accent, #00ff88);
  background: rgba(0, 255, 136, 0.06);
}

.output-launch-btn:active {
  transform: scale(0.96);
}

.output-launch-active {
  border-color: var(--grackle-accent, #00ff88);
  color: var(--grackle-accent, #00ff88);
  background: rgba(0, 255, 136, 0.1);
  box-shadow: 0 0 12px rgba(0, 255, 136, 0.2);
}

.output-icon {
  font-size: 0.55rem;
  opacity: 0.7;
}

.output-count {
  background: var(--grackle-accent, #00ff88);
  color: #000;
  border-radius: 999px;
  font-size: 0.55rem;
  font-weight: 900;
  padding: 1px 5px;
  min-width: 14px;
  text-align: center;
}
</style>
