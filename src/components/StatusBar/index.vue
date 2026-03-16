<template>
  <grid columns="4" class="status-bar tags">
    <c span="1+4" class="items">
      <StatusBarItem v-for="(item, itemName) in builtInItems" :key="itemName">
        <component :is="item"></component>
      </StatusBarItem>

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
    // projectItem,
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
</style>
