<template>
  <main id="app">
    <golden-layout
      class="hscreen"
      :showCloseIcon="false"
      :showPopoutIcon="false"
      :showMaximiseIcon="false"
      :state.sync="layoutState"
      @state="updateLayoutState"
      @creation-error="creationError"
      :headerHeight="18"
      :key="triggerUiRestart"
    >
      <gl-col>
        <gl-row>
          <gl-col :closable="false" :minItemWidth="100" id="lr-col">
            <gl-stack title="Groups Stack">
              <gl-component title="Groups" :closable="false">
                <Groups />
              </gl-component>
            </gl-stack>
          </gl-col>
          <gl-col :width="33" :closable="false" ref="rightColumn">
            <gl-stack title="Module Inspector Stack">
              <gl-component title="hidden">
                <!-- hack around dynamic components not working correctly. CSS below hides tabs with the title "hidden" -->
              </gl-component>
              <gl-component
                v-for="(module, i) in focusedModules"
                :key="i"
                :title="`${module.meta.name} properties`"
                :closable="false"
                ref="moduleInspector"
                :state="{ is: 'dynamic' }"
              >
                <ModuleInspector :moduleId="module.$id" />
              </gl-component>
            </gl-stack>
          </gl-col>
        </gl-row>
        <gl-row>
          <gl-component title="Info View" :closable="false">
            <InfoView />
          </gl-component>

          <gl-component title="Gallery" :closable="false">
            <Gallery />
          </gl-component>

          <gl-stack title="Input Stack">
            <gl-component title="Input Config" :closable="false">
              <InputConfig />
            </gl-component>

            <gl-stack title="Input Device Config" :closable="false">
              <gl-component title="Audio/Video" :closable="false">
                <AudioVideoDeviceConfig />
              </gl-component>
              <gl-component title="MIDI" :closable="false">
                <MIDIDeviceConfig />
              </gl-component>
              <gl-component title="MIDI Learn" :closable="false">
                <MIDILearnView />
              </gl-component>
              <gl-component title="BPM" :closable="false">
                <BPMPanel />
              </gl-component>
              <gl-component title="NDI" :closable="false">
                <NDIConfig />
              </gl-component>
            </gl-stack>

            <gl-component title="Plugins" :closable="false">
              <Plugins />
            </gl-component>
          </gl-stack>

          <gl-stack title="Preview Stack">
            <gl-component title="Preview" :closable="false">
              <Preview />
            </gl-component>

            <gl-component title="Clip Launcher" :closable="false">
              <ClipLauncherView />
            </gl-component>

            <gl-component title="Scenes" :closable="false">
              <ScenePanel />
            </gl-component>

            <gl-component title="Projection Editor" :closable="false">
              <ProjectionEditorView />
            </gl-component>

            <gl-component title="Effect Chain" :closable="false">
              <EffectChainView />
            </gl-component>
          </gl-stack>
        </gl-row>
      </gl-col>
    </golden-layout>

    <StatusBar />
    <Search />

    <FrameRateDialog />

    <ErrorWatcher />

    <!-- Keyboard shortcuts overlay — toggle with ? -->
    <transition name="shortcuts-fade">
      <div
        v-if="showShortcutsOverlay"
        class="shortcuts-overlay"
        @click.self="showShortcutsOverlay = false"
      >
        <div class="shortcuts-panel">
          <div class="shortcuts-title">Keyboard Shortcuts</div>
          <div class="shortcuts-grid">
            <div class="shortcuts-section">
              <div class="shortcuts-section-label">Clip Triggers</div>
              <div class="shortcut-row">
                <kbd>1 – 8</kbd><span>Trigger row 1 slots (active deck)</span>
              </div>
              <div class="shortcut-row">
                <kbd>Q W E R T Y U I</kbd
                ><span>Trigger row 2 slots (active deck)</span>
              </div>
              <div class="shortcut-row">
                <kbd>Shift + 1–8</kbd
                ><span>Scene row trigger (both decks)</span>
              </div>
            </div>
            <div class="shortcuts-section">
              <div class="shortcuts-section-label">Output</div>
              <div class="shortcut-row">
                <kbd>B</kbd><span>Blackout (hold)</span>
              </div>
              <div class="shortcut-row">
                <kbd>`</kbd><span>Whiteout (hold)</span>
              </div>
              <div class="shortcut-row">
                <kbd>O</kbd><span>Open output window</span>
              </div>
              <div class="shortcut-row">
                <kbd>F</kbd><span>Fullscreen</span>
              </div>
              <div class="shortcut-row">
                <kbd>Esc</kbd><span>Exit fullscreen</span>
              </div>
            </div>
            <div class="shortcuts-section">
              <div class="shortcuts-section-label">Nudge / Scrub</div>
              <div class="shortcut-row">
                <kbd>← →</kbd><span>Scrub Deck A (±0.1s)</span>
              </div>
              <div class="shortcut-row">
                <kbd>↑ ↓</kbd><span>Scrub Deck B (±0.1s)</span>
              </div>
              <div class="shortcut-row">
                <kbd>, .</kbd><span>Crossfader ←/→ (±5%)</span>
              </div>
              <div class="shortcut-row">
                <kbd>[ ]</kbd><span>Deck A speed ÷2 / ×2</span>
              </div>
              <div class="shortcut-row">
                <kbd>{ }</kbd><span>Deck B speed ÷2 / ×2</span>
              </div>
            </div>
            <div class="shortcuts-section">
              <div class="shortcuts-section-label">Tempo</div>
              <div class="shortcut-row">
                <kbd>Space</kbd><span>Tap tempo</span>
              </div>
            </div>
            <div class="shortcuts-section">
              <div class="shortcuts-section-label">UI</div>
              <div class="shortcut-row">
                <kbd>?</kbd><span>Toggle this overlay</span>
              </div>
            </div>
          </div>
          <div class="shortcuts-close" @click="showShortcutsOverlay = false">
            ✕ close
          </div>
        </div>
      </div>
    </transition>
  </main>
</template>

<script>
import Preview from "@/components/Preview";
import ClipLauncherView from "@/components/ClipLauncherView";
import ScenePanel from "@/components/ScenePanel";
import ProjectionEditorView from "@/components/ProjectionEditorView";
import BPMPanel from "@/components/BPMPanel";
import MIDILearnView from "@/components/MIDILearnView";
import EffectChainView from "@/components/EffectChainView";
import Groups from "@/components/Groups";
import Gallery from "@/components/Gallery";
import InputConfig from "@/components/InputConfig";
import AudioVideoDeviceConfig from "@/components/InputDeviceConfig/AudioVideo.vue";
import MIDIDeviceConfig from "@/components/InputDeviceConfig/MIDI.vue";
import NDIConfig from "@/components/InputDeviceConfig/NDI.vue";
import StatusBar from "@/components/StatusBar";
import ModuleInspector from "@/components/ModuleInspector";
import InfoView from "@/components/InfoView";
import Search from "@/components/Search";
import FrameRateDialog from "@/components/dialogs/FrameRateDialog";
import ErrorWatcher from "@/components/ErrorWatcher";
import Plugins from "@/components/Plugins";
import clipLauncher from "@/media-manager/ClipLauncher";
import midiBindingService from "@/application/MidiBindingService";
import deckMixer from "@/application/DeckMixer";

import getNextName from "@/application/utils/get-next-name";
import constants from "@/application/constants";

import * as GoldenLayout from "golden-layout";
import { ipcRenderer } from "electron";

export default {
  name: "app",

  components: {
    Preview,
    ClipLauncherView,
    ScenePanel,
    ProjectionEditorView,
    BPMPanel,
    MIDILearnView,
    EffectChainView,
    Groups,
    Gallery,
    InputConfig,
    AudioVideoDeviceConfig,
    MIDIDeviceConfig,
    NDIConfig,
    StatusBar,
    InfoView,
    ModuleInspector,
    Search,
    FrameRateDialog,
    ErrorWatcher,
    Plugins,
  },

  data() {
    return {
      moduleInspectorIVTitle: "Module Inspector",
      moduleInspectorIVBody:
        "The properties of the selected Module. This panel can be pinned for easy access.",
      state: null,
      layoutState: null,

      triggerUiRestart: 0,
      showShortcutsOverlay: false,
    };
  },

  computed: {
    focusedModules() {
      const focusedOrPinned = this.$store.getters["ui-modules/focusedOrPinned"];
      const modules = focusedOrPinned.map(
        (id) => this.$modV.store.state.modules.active[id]
      );

      return modules;
    },

    focusedActiveModule() {
      return this.$store.state["ui-modules"].focused;
    },
  },

  created() {
    // Bump this version string whenever new panels are added to the default layout.
    // Any stored layout from a prior version is discarded so new panels appear.
    const LAYOUT_VERSION = "grackle-1.1";
    const storedVersion = window.localStorage.getItem("grackle-layout-version");
    if (storedVersion !== LAYOUT_VERSION) {
      window.localStorage.removeItem(constants.LAYOUT_STATE_KEY);
      window.localStorage.setItem("grackle-layout-version", LAYOUT_VERSION);
    }

    const layoutState = window.localStorage.getItem(constants.LAYOUT_STATE_KEY);
    if (layoutState) {
      try {
        this.layoutState = JSON.parse(layoutState);
      } catch (e) {
        this.creationError();
      }
    }

    ipcRenderer.on("reset-layout", () => {
      this.resetGoldenLayoutState();
      this.restartLayout();
    });
  },

  async mounted() {
    this.rightColumnWidth = window.innerWidth * 0.33;
    this.globalKeydownListener = (event) => this.handleGlobalKeydown(event);
    this.globalKeyupListener = (event) => this.handleGlobalKeyup(event);
    window.addEventListener("keydown", this.globalKeydownListener);
    window.addEventListener("keyup", this.globalKeyupListener);
    midiBindingService.startListening();
    deckMixer.start();
    clipLauncher.reloadStaleSlots();
  },

  beforeDestroy() {
    window.removeEventListener("keydown", this.globalKeydownListener);
    window.removeEventListener("keyup", this.globalKeyupListener);
    midiBindingService.stopListening();
    deckMixer.stop();
  },

  methods: {
    isEditableTarget(target) {
      if (!target) {
        return false;
      }

      const tagName = target.tagName;

      return (
        target.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        tagName === "BUTTON"
      );
    },

    getShortcutDeck() {
      const decks = this.$store.state["clip-launcher"].decks;
      const deckAActive = decks.A.some((row) =>
        row.some((slot) => slot.active)
      );
      const deckBActive = decks.B.some((row) =>
        row.some((slot) => slot.active)
      );

      if (deckBActive && !deckAActive) {
        return "B";
      }

      return "A";
    },

    triggerShortcutClip(row, col) {
      clipLauncher.triggerClip(this.getShortcutDeck(), row, col);
    },

    triggerSceneRow(row) {
      const decks = ["A", "B"];
      const launcherState = this.$store.state["clip-launcher"];

      for (let i = 0, len = decks.length; i < len; i++) {
        const deck = decks[i];
        const deckSlots = launcherState.decks[deck]?.[row];

        if (!deckSlots) {
          continue;
        }

        const firstLoaded = deckSlots.find(
          (slot) => slot.source && slot.source.url
        );

        if (firstLoaded) {
          const parts = firstLoaded.id.split("-");
          clipLauncher.triggerClip(
            deck,
            parseInt(parts[1], 10),
            parseInt(parts[2], 10)
          );
        }
      }
    },

    triggerTapTempoFallback() {
      if (typeof clipLauncher.tap === "function") {
        clipLauncher.tap();
        return;
      }

      if (typeof clipLauncher.tapTempo === "function") {
        clipLauncher.tapTempo();
        return;
      }

      clipLauncher.emit("tap-tempo");
    },

    async requestAppFullscreen() {
      const appElement = document.getElementById("app");

      if (
        !appElement ||
        document.fullscreenElement ||
        !appElement.requestFullscreen
      ) {
        return;
      }

      try {
        await appElement.requestFullscreen();
      } catch (error) {
        // Ignore rejected fullscreen requests caused by platform/browser policy.
      }
    },

    async exitAppFullscreen() {
      if (!document.fullscreenElement || !document.exitFullscreen) {
        return;
      }

      try {
        await document.exitFullscreen();
      } catch (error) {
        // Ignore rejected exit requests caused by platform/browser policy.
      }
    },

    handleGlobalKeydown(event) {
      const key = event.key.toLowerCase();

      if (
        (event.defaultPrevented && key !== " ") ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      const isEditableTarget = this.isEditableTarget(event.target);

      // Shift+1-8: trigger scene row on both decks simultaneously
      if (event.shiftKey && !isEditableTarget) {
        const sceneRow = parseInt(event.key, 10);

        if (sceneRow >= 1 && sceneRow <= 8) {
          event.preventDefault();
          this.triggerSceneRow(sceneRow - 1);
          return;
        }
      }

      if (key === "escape") {
        if (this.showShortcutsOverlay) {
          this.showShortcutsOverlay = false;
          return;
        }

        this.exitAppFullscreen();
        return;
      }

      if (isEditableTarget) {
        return;
      }

      const isArrow = key.startsWith("arrow");
      if (event.repeat && key !== " " && !isArrow) {
        return;
      }

      const numberRowMap = {
        1: 0,
        2: 1,
        3: 2,
        4: 3,
        5: 4,
        6: 5,
        7: 6,
        8: 7,
      };
      const secondRowMap = {
        q: 0,
        w: 1,
        e: 2,
        r: 3,
        t: 4,
        y: 5,
        u: 6,
        i: 7,
      };

      if (Object.prototype.hasOwnProperty.call(numberRowMap, key)) {
        this.triggerShortcutClip(0, numberRowMap[key]);
        return;
      }

      if (Object.prototype.hasOwnProperty.call(secondRowMap, key)) {
        this.triggerShortcutClip(1, secondRowMap[key]);
        return;
      }

      if (key === " ") {
        this.triggerTapTempoFallback();
        return;
      }

      if (key === "f") {
        this.requestAppFullscreen();
        return;
      }

      // B: blackout (hold to blackout, release to restore)
      if (key === "b") {
        deckMixer.setBlackout(true);
        return;
      }

      // O: open output window
      if (key === "o") {
        this.openOutputWindow();
      }

      // ` (backtick): whiteout (hold) — W conflicts with Q-I row shortcut
      if (event.key === "`") {
        deckMixer.setWhiteout(true);
        return;
      }

      // Arrow keys: nudge clip position (A = ←/→, B = ↑/↓)
      const NUDGE_SEC = 0.1;
      if (key === "arrowleft") {
        event.preventDefault();
        deckMixer.playerA.nudge(-NUDGE_SEC);
        return;
      }

      if (key === "arrowright") {
        event.preventDefault();
        deckMixer.playerA.nudge(NUDGE_SEC);
        return;
      }

      if (key === "arrowup") {
        event.preventDefault();
        deckMixer.playerB.nudge(NUDGE_SEC);
        return;
      }

      if (key === "arrowdown") {
        event.preventDefault();
        deckMixer.playerB.nudge(-NUDGE_SEC);
        return;
      }

      // , / . : nudge crossfader left/right
      if (event.key === "," || event.key === "<") {
        event.preventDefault();
        const cf = this.$store.state["clip-launcher"]?.crossfader ?? 0.5;
        clipLauncher.setCrossfader(Math.max(0, cf - 0.05));
        return;
      }

      if (event.key === "." || event.key === ">") {
        event.preventDefault();
        const cf = this.$store.state["clip-launcher"]?.crossfader ?? 0.5;
        clipLauncher.setCrossfader(Math.min(1, cf + 0.05));
        return;
      }

      // [ / ] : halve / double Deck A master speed
      if (event.key === "[") {
        event.preventDefault();
        const speed = deckMixer.getMasterSpeed("A");
        deckMixer.setMasterSpeed("A", Math.max(0.05, speed / 2));
        return;
      }

      if (event.key === "]") {
        event.preventDefault();
        const speed = deckMixer.getMasterSpeed("A");
        deckMixer.setMasterSpeed("A", Math.min(32, speed * 2));
        return;
      }

      // { / } : halve / double Deck B master speed
      if (event.key === "{") {
        event.preventDefault();
        const speed = deckMixer.getMasterSpeed("B");
        deckMixer.setMasterSpeed("B", Math.max(0.05, speed / 2));
        return;
      }

      if (event.key === "}") {
        event.preventDefault();
        const speed = deckMixer.getMasterSpeed("B");
        deckMixer.setMasterSpeed("B", Math.min(32, speed * 2));
        return;
      }

      // ?: toggle keyboard shortcuts overlay
      if (event.key === "?" || event.key === "/") {
        this.showShortcutsOverlay = !this.showShortcutsOverlay;
      }
    },

    handleGlobalKeyup(event) {
      const key = event.key.toLowerCase();

      if (key === "b") {
        deckMixer.setBlackout(false);
      }

      if (event.key === "`") {
        deckMixer.setWhiteout(false);
      }
    },

    async openOutputWindow() {
      if (!this.$modV) {
        return;
      }

      try {
        await this.$modV.store.dispatch("windows/createWindow");
      } catch (e) {
        console.warn("[App] Could not open output window:", e);
      }
    },

    toggleModulePin(id) {
      if (this.isPinned(id)) {
        this.$store.commit("ui-modules/REMOVE_PINNED", id);
      } else {
        this.$store.commit("ui-modules/ADD_PINNED", id);
      }
    },

    isPinned(id) {
      return this.$store.state["ui-modules"].pinned.indexOf(id) > -1;
    },

    /**
     * @description Traverses a Golden Layout state object to find GL Components
     * which have `componentState.is === "dynamic"` and removes them.
     *
     * If the containing GL Stack has no title, we can assume the dynamically
     * added component has been moved in the UI and the stack was created to
     * house the component, so we remove that too.
     *
     * We must remove these elements as GL's state must match the Vue virtual
     * DOM at time of mounting <golden-layout />. If we left these dynamically
     * created GL Components in the state, GL would not know what they are and
     * would error, resulting in the app not mounting and breaking.
     *
     * @param {GoldenLayout config}  config
     * @returns {GoldenLayout config}
     */
    purgeDynamicPanels(config) {
      if (Array.isArray(config.content)) {
        const itemsToSplice = [];

        const content = config.content;
        const childrenToSplice = [];
        for (let index = 0, len = content.length; index < len; index++) {
          const item = content[index];

          if (
            item.type === "component" &&
            item.componentState.is === "dynamic"
          ) {
            itemsToSplice.push(index);
          } else {
            if (this.purgeDynamicPanels(item) === true) {
              childrenToSplice.push(index);
            }
          }
        }

        // eslint-disable-next-line no-for-each/no-for-each
        childrenToSplice.forEach((index) => {
          content.splice(index, 1);
          config.activeItemIndex = 0;
        });

        if (itemsToSplice.length > 0) {
          // eslint-disable-next-line no-for-each/no-for-each
          itemsToSplice.forEach((index) => {
            config.content.splice(index, 1);
            config.activeItemIndex = 0;
          });

          if (config.title === "" && config.type === "stack") {
            return true;
          }
        }
      }

      return config;
    },

    /**
     * @description Called when <golden-layout /> updates its state.
     * Unminifies config, purges dynamically added panels, minifies and saves to
     * localStorage key `constants.LAYOUT_STATE_KEY`.
     *
     * @param {GoldenLayout config} value
     */
    updateLayoutState(configIn) {
      const config = GoldenLayout.unminifyConfig(configIn);
      const cleanedConfig = this.purgeDynamicPanels(config);

      window.localStorage.setItem(
        constants.LAYOUT_STATE_KEY,
        JSON.stringify(GoldenLayout.minifyConfig(cleanedConfig))
      );
    },

    async creationError() {
      const localStorageKeys = Object.keys(window.localStorage);

      const nextKey = await getNextName(
        constants.LAYOUT_STATE_KEY,
        localStorageKeys
      );
      window.localStorage.setItem(nextKey, JSON.stringify(this.layoutState));

      console.warn(
        "Layout could not be restored. Default layout loaded and old layout was saved to a backup local storage key"
      );

      this.resetGoldenLayoutState();
      this.restartLayout();
    },

    resetGoldenLayoutState() {
      window.localStorage.removeItem(constants.LAYOUT_STATE_KEY);
      this.layoutState = undefined;
    },

    /**
     * @description Restarts Golden Layout.
     * We increment a variable which is assigned to the key of the root Golden Layout element.
     * If the key is updated, the element is forced to dismount and mount again.
     */
    restartLayout() {
      this.resetGoldenLayoutState();
      this.triggerUiRestart++;
    },
  },

  watch: {
    focusedActiveModule(inspectorId) {
      const index = this.$store.state["ui-modules"].pinned.findIndex(
        (item) => item === inspectorId
      );

      if (index > -1) {
        this.$refs.moduleInspector[index].focus();
      }
    },
  },
};
</script>

<style>
input:focus-visible,
select:focus-visible {
  outline-style: solid;
  outline-width: 2px;
}

.tooltip {
  position: absolute;
  padding: 4px;
  color: white;
  background: #151515;
  pointer-events: none;
  z-index: 100;
}

.tooltip pre {
  overflow: hidden;
}
</style>

<style>
.smooth-dnd-container.vertical > .smooth-dnd-draggable-wrapper {
  overflow: initial;
}
</style>

<style>
body {
  background: rgb(45, 45, 45);
}

@keyframes loading {
  0% {
    font-size: 4rem;
  }

  100% {
    font-size: 7rem;
  }
}

#loading {
  font-size: 4rem;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-content: center;
}

#loading span {
  animation: loading 1.4s cubic-bezier(0.87, 0, 0.13, 1) infinite forwards
    alternate;
}
</style>

<style>
@import url("./css/inter.css");
@import url("./css/iaw.css");
@import url("./css/raster.css");
@import url("./css/golden-layout_theme.css");

:root {
  --fontSize: 16px;
  --sansFont: "Inter var", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", "微軟雅黑", "Microsoft YaHei", "微軟正黑體",
    "Microsoft JhengHei", Verdana, Arial, sans-serif !important;
  --monoFont: "iaw-mono";
  --lineHeight: calc(var(--fontSize) * 1.5);
  --baseline: calc(var(--lineHeight) / 2);
  --blockSpacingTop: 0px;
  --blockSpacingBottom: var(--lineHeight);
  --hrThickness: 2px;
  --h1-size: 2.8rem;
  --h2-size: 2.2rem;
  --h3-size: 1.4rem;
  --h4-size: 1.1rem;
  --columnGap: 8px;
  --rowGap: 8px;
  --displayScale: 1;
  --pixel: 1px;
  --foreground-color-rgb: 255, 255, 255;
  --foreground-color-a: 1;
  --foreground-color: rgba(
    var(--foreground-color-rgb),
    var(--foreground-color-a)
  );

  --foreground-color-1: rgba(var(--foreground-color-rgb), 0.5);
  --foreground-color-2: rgba(var(--foreground-color-rgb), 0.4);
  --foreground-color-3: rgba(var(--foreground-color-rgb), 0.2);
  --foreground-color-4: rgba(var(--foreground-color-rgb), 0.1);

  --background-color-rgb: 17, 17, 17;
  --background-color-a: 1;
  --background-color: rgba(
    var(--background-color-rgb),
    var(--background-color-a)
  );
  --background-color-1: rgba(var(--background-color-rgb), 0.8);
  --background-color-2: rgba(var(--background-color-rgb), 0.7);
  --background-color-3: rgba(var(--background-color-rgb), 0.5);
  --background-color-4: rgba(var(--background-color-rgb), 0.4);

  --focus-color-rgb: 241, 196, 16;
  --focus-color-a: 1;
  --focus-color: rgba(var(--focus-color-rgb), var(--focus-color-a));
}

*::-webkit-scrollbar {
  width: 14px;
  height: 14px;
  background-color: var(--foreground-color-3);
}

*::-webkit-scrollbar-thumb {
  background: var(--foreground-color-2);
}

* {
  box-sizing: border-box;
}

.hidden {
  display: none;
}

html,
body,
#app {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

body {
  margin: 0;
  padding: 0;
  font-size: 14px;
}

.hscreen {
  width: 100vw;
  height: 100%;
}

html,
body,
#app {
  margin: 0;
  height: 100%;
  position: relative;
}

#app {
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  align-items: stretch;
}
</style>

<style>
::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

::-webkit-scrollbar-track {
  background: #c4c4c4;
  border-radius: 10px;
}

::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background: #363636;
}

::-webkit-scrollbar-corner,
::-webkit-resizer {
  background: transparent;
}
</style>

<style>
/* Keyboard shortcuts overlay */
.shortcuts-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.shortcuts-fade-enter-active,
.shortcuts-fade-leave-active {
  transition: opacity 160ms ease;
}

.shortcuts-fade-enter,
.shortcuts-fade-leave-to {
  opacity: 0;
}

.shortcuts-panel {
  background: #1a1d24;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  padding: 24px 28px;
  min-width: 480px;
  max-width: 640px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8);
}

.shortcuts-title {
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 12px;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 32px;
}

.shortcuts-section-label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: rgba(93, 255, 147, 0.8);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.shortcut-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
}

.shortcut-row kbd {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 5px;
  padding: 2px 7px;
  font-size: 0.7rem;
  font-family: monospace;
  color: #fff;
  white-space: nowrap;
  flex-shrink: 0;
}

.shortcuts-close {
  margin-top: 20px;
  text-align: right;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  transition: color 120ms ease;
}

.shortcuts-close:hover {
  color: rgba(255, 255, 255, 0.7);
}
</style>
