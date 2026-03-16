<template>
  <div
    class="clip-launcher"
    v-infoView="{ title: iVTitle, body: iVBody, id: 'Clip Launcher Panel' }"
    v-searchTerms="{
      terms: ['clip', 'launcher', 'deck', 'crossfader'],
      title: 'Clip Launcher',
      type: 'Panel',
    }"
    @click.self="closePopover"
  >
    <!-- Slot settings popover -->
    <div
      v-if="popover.visible"
      class="slot-popover"
      :style="popover.style"
      @click.stop
    >
      <div class="popover-title">{{ popover.slotLabel }}</div>

      <label class="popover-label">Loop</label>
      <div class="popover-loop-buttons">
        <button
          v-for="mode in loopModes"
          :key="mode.value"
          type="button"
          class="loop-btn"
          :class="{ 'loop-btn-active': popover.loopMode === mode.value }"
          @click="setPopoverLoop(mode.value)"
        >
          {{ mode.label }}
        </button>
      </div>

      <label class="popover-label"
        >Speed
        <span class="popover-value"
          >{{ popover.speed.toFixed(2) }}x</span
        ></label
      >
      <input
        type="range"
        class="popover-slider"
        min="0.1"
        max="4"
        step="0.05"
        :value="popover.speed"
        @input="setPopoverSpeed($event.target.value)"
      />

      <div class="popover-actions">
        <button type="button" class="popover-apply" @click="applyPopover">
          Apply
        </button>
        <button type="button" class="popover-clear" @click="clearPopoverSlot">
          Clear
        </button>
      </div>
    </div>

    <section class="deck-column">
      <header class="deck-title">Deck A</header>
      <div class="deck-grid">
        <button
          v-for="slot in flatDeckA"
          :key="slot.id"
          type="button"
          class="clip-slot"
          :class="{ active: slot.active, loaded: Boolean(slot.source) }"
          :style="slotStyle(slot)"
          @mousedown="startLongPress('A', slot, $event)"
          @mouseup="endLongPress('A', slot)"
          @mouseleave="cancelLongPress"
          @touchstart.prevent="startLongPress('A', slot, $event)"
          @touchend.prevent="endLongPress('A', slot)"
          @contextmenu.prevent="clearSlot('A', slot)"
          @dragenter.prevent
          @dragover.prevent
          @drop.prevent="dropFile('A', slot, $event)"
        >
          <span class="slot-index">{{ slotAddress(slot.id) }}</span>
          <span class="slot-name" :class="{ overlay: Boolean(slot.thumbnail) }">
            {{ slotLabel(slot) }}
          </span>
          <span v-if="slot.source" class="slot-meta">{{ slotMeta(slot) }}</span>
        </button>
      </div>
    </section>

    <section class="crossfader-column">
      <button
        class="sync-toggle"
        :class="{ 'sync-toggle-active': beatSyncMode === 'sync' }"
        type="button"
        @click="toggleBeatSync"
      >
        <span>SYNC</span>
        <span
          class="beat-indicator"
          :class="{ 'beat-indicator-active': beatPulseActive }"
        ></span>
      </button>
      <div class="crossfader-labels">
        <span>A</span>
        <span>{{ crossfaderLabel }}</span>
        <span>B</span>
      </div>
      <input
        class="crossfader"
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="crossfader"
        @input="setCrossfader($event.target.value)"
      />
    </section>

    <section class="deck-column">
      <header class="deck-title">Deck B</header>
      <div class="deck-grid">
        <button
          v-for="slot in flatDeckB"
          :key="slot.id"
          type="button"
          class="clip-slot"
          :class="{ active: slot.active, loaded: Boolean(slot.source) }"
          :style="slotStyle(slot)"
          @mousedown="startLongPress('B', slot, $event)"
          @mouseup="endLongPress('B', slot)"
          @mouseleave="cancelLongPress"
          @touchstart.prevent="startLongPress('B', slot, $event)"
          @touchend.prevent="endLongPress('B', slot)"
          @contextmenu.prevent="clearSlot('B', slot)"
          @dragenter.prevent
          @dragover.prevent
          @drop.prevent="dropFile('B', slot, $event)"
        >
          <span class="slot-index">{{ slotAddress(slot.id) }}</span>
          <span class="slot-name" :class="{ overlay: Boolean(slot.thumbnail) }">
            {{ slotLabel(slot) }}
          </span>
          <span v-if="slot.source" class="slot-meta">{{ slotMeta(slot) }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script>
import clipLauncher from "../media-manager/ClipLauncher";

const LOOP_MODES = [
  { label: "Loop", value: "loop" },
  { label: "↔", value: "ping-pong" },
  { label: "Once", value: "once" },
  { label: "Hold", value: "hold" },
];

function parseSlotId(id) {
  const [, row, col] = id.split("-");

  return {
    row: parseInt(row, 10),
    col: parseInt(col, 10),
  };
}

function flattenDeck(deck) {
  const slots = [];

  for (let row = 0; row < deck.length; row++) {
    for (let col = 0; col < deck[row].length; col++) {
      slots.push(deck[row][col]);
    }
  }

  return slots;
}

export default {
  data() {
    return {
      iVTitle: "Clip Launcher",
      iVBody:
        "Two 8x8 clip decks with per-slot loading, triggering, clearing, and a center crossfader for blending deck A and deck B.",
      beatPulseActive: false,
      beatPulseTimeout: null,
      beatPollInterval: null,
      beatSyncMode: clipLauncher.beatSyncMode,
      lastKickState: false,
      loopModes: LOOP_MODES,
      popover: {
        visible: false,
        deck: null,
        slot: null,
        slotLabel: "",
        loopMode: "loop",
        speed: 1.0,
        style: {},
      },
      longPress: {
        timer: null,
        triggered: false,
        deck: null,
        slot: null,
        event: null,
      },
    };
  },

  mounted() {
    this.lastKickState = Boolean(this.$modV?.store?.state?.beats?.kick);
    this.beatPollInterval = setInterval(this.pollBeatState, 1000 / 60);
    this.stopListeningForBeatSyncMode = clipLauncher.on(
      "beat-sync-mode-changed",
      (mode) => {
        this.beatSyncMode = mode;
      }
    );
    document.addEventListener("click", this.closePopover);
    document.addEventListener("keydown", this.onKeyDown);
  },

  beforeDestroy() {
    clearInterval(this.beatPollInterval);
    this.beatPollInterval = null;
    clearTimeout(this.beatPulseTimeout);
    this.beatPulseTimeout = null;
    if (this.stopListeningForBeatSyncMode) {
      this.stopListeningForBeatSyncMode();
      this.stopListeningForBeatSyncMode = null;
    }
    document.removeEventListener("click", this.closePopover);
    document.removeEventListener("keydown", this.onKeyDown);
    this.cancelLongPress();
  },

  computed: {
    decks() {
      return this.$store.state["clip-launcher"].decks;
    },

    crossfader() {
      return this.$store.state["clip-launcher"].crossfader;
    },

    crossfaderLabel() {
      return `${Math.round(this.crossfader * 100)}% B`;
    },

    flatDeckA() {
      return flattenDeck(this.decks.A);
    },

    flatDeckB() {
      return flattenDeck(this.decks.B);
    },
  },

  methods: {
    slotAddress(id) {
      const { row, col } = parseSlotId(id);

      return `${row + 1}:${col + 1}`;
    },

    slotLabel(slot) {
      return slot.source?.name || "Empty";
    },

    slotMeta(slot) {
      const speed = slot.speed !== 1.0 ? `${slot.speed.toFixed(1)}x` : "";
      const loop =
        slot.loopMode !== "loop"
          ? slot.loopMode === "ping-pong"
            ? "↔"
            : slot.loopMode
          : "";
      return [speed, loop].filter(Boolean).join(" ");
    },

    slotStyle(slot) {
      const thumb = slot.thumbnail;
      // Only allow data:image/* or blob: URLs to prevent CSS injection
      if (!thumb || !/^(data:image\/|blob:)/.test(thumb)) {
        return null;
      }

      return {
        backgroundImage: `linear-gradient(to top, rgba(0, 0, 0, 0.82), rgba(0, 0, 0, 0.12)), url(${thumb})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    },

    startLongPress(deck, slot, event) {
      this.cancelLongPress();
      this.longPress.triggered = false;
      this.longPress.deck = deck;
      this.longPress.slot = slot;
      this.longPress.event = event;
      this.longPress.timer = setTimeout(() => {
        if (slot.source) {
          this.longPress.triggered = true;
          this.openPopover(deck, slot, event);
        }
      }, 420);
    },

    endLongPress(deck, slot) {
      const wasTriggered = this.longPress.triggered;
      this.cancelLongPress();

      if (!wasTriggered) {
        this.triggerSlot(deck, slot);
      }
    },

    cancelLongPress() {
      if (this.longPress.timer) {
        clearTimeout(this.longPress.timer);
        this.longPress.timer = null;
      }
    },

    triggerSlot(deck, slot) {
      if (this.popover.visible) {
        this.closePopover();
        return;
      }

      const { row, col } = parseSlotId(slot.id);
      clipLauncher.triggerClip(deck, row, col);
    },

    clearSlot(deck, slot) {
      const { row, col } = parseSlotId(slot.id);
      clipLauncher.clearSlot(deck, row, col);
    },

    setCrossfader(value) {
      clipLauncher.setCrossfader(value);
    },

    toggleBeatSync() {
      const mode = this.beatSyncMode === "sync" ? "free" : "sync";

      this.beatSyncMode = clipLauncher.setBeatSyncMode(mode);
    },

    pulseBeatIndicator() {
      this.beatPulseActive = true;
      clearTimeout(this.beatPulseTimeout);
      this.beatPulseTimeout = setTimeout(() => {
        this.beatPulseActive = false;
        this.beatPulseTimeout = null;
      }, 120);
    },

    pollBeatState() {
      const kick = Boolean(this.$modV?.store?.state?.beats?.kick);

      if (kick && !this.lastKickState) {
        this.pulseBeatIndicator();
      }

      this.lastKickState = kick;
    },

    dropFile(deck, slot, event) {
      const [file] = event.dataTransfer.files || [];

      if (!file || !clipLauncher.isSupportedFile(file)) {
        return;
      }

      const { row, col } = parseSlotId(slot.id);
      clipLauncher.loadClip(deck, row, col, file);
    },

    // Slot settings popover
    openPopover(deck, slot, event) {
      if (!slot.source) {
        // No clip loaded — do nothing on right-click
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const containerRect = this.$el.getBoundingClientRect();

      let top = rect.top - containerRect.top + rect.height + 4;
      let left = rect.left - containerRect.left;

      // Clamp within container
      if (left + 200 > containerRect.width) {
        left = containerRect.width - 204;
      }

      if (top + 210 > containerRect.height) {
        top = rect.top - containerRect.top - 214;
      }

      this.popover = {
        visible: true,
        deck,
        slot,
        slotLabel: slot.source.name,
        loopMode: slot.loopMode || "loop",
        speed: slot.speed || 1.0,
        style: { top: `${top}px`, left: `${left}px` },
      };
    },

    closePopover() {
      this.popover.visible = false;
    },

    setPopoverLoop(mode) {
      this.popover.loopMode = mode;
    },

    setPopoverSpeed(value) {
      this.popover.speed = Math.max(0.1, Math.min(16, parseFloat(value) || 1));
    },

    applyPopover() {
      if (!this.popover.slot) {
        return;
      }

      const { deck, slot, loopMode, speed } = this.popover;
      const { row, col } = parseSlotId(slot.id);

      clipLauncher.updateSlotSettings(deck, row, col, { loopMode, speed });
      this.closePopover();
    },

    clearPopoverSlot() {
      if (!this.popover.slot) {
        return;
      }

      const { deck, slot } = this.popover;
      const { row, col } = parseSlotId(slot.id);

      this.closePopover();
      clipLauncher.clearSlot(deck, row, col);
    },

    onKeyDown(e) {
      if (e.key === "Escape" && this.popover.visible) {
        this.closePopover();
      }
    },
  },
};
</script>

<style scoped>
.clip-launcher {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px minmax(0, 1fr);
  gap: 12px;
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
  position: relative;
}

.deck-column {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.deck-title {
  color: var(--foreground-color-1);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.deck-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  grid-template-rows: repeat(8, minmax(0, 1fr));
  gap: 6px;
}

.clip-slot {
  min-width: 0;
  min-height: 0;
  aspect-ratio: 1 / 1;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #24272f;
  color: var(--foreground-color-1);
  border-radius: 6px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: left;
  overflow: hidden;
  transition: background 120ms ease, border-color 120ms ease,
    transform 120ms ease;
}

.clip-slot:hover {
  border-color: rgba(255, 255, 255, 0.28);
  transform: translateY(-1px);
}

.clip-slot.loaded {
  background: #2d3340;
}

.clip-slot.active {
  background: #1f7a38;
  border-color: #5dff93;
}

.slot-index {
  font-size: 0.65rem;
  opacity: 0.55;
  line-height: 1;
}

.slot-name {
  font-size: 0.65rem;
  line-height: 1.2;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.slot-name.overlay {
  align-self: stretch;
  margin: 0 -4px -4px;
  padding: 8px 4px 4px;
}

.slot-meta {
  font-size: 0.6rem;
  opacity: 0.7;
  color: var(--accent-color, #5dff93);
  line-height: 1;
}

/* Popover */
.slot-popover {
  position: absolute;
  z-index: 100;
  background: #1a1d24;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 10px;
  padding: 12px;
  width: 200px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.popover-title {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--foreground-color-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 8px;
}

.popover-label {
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.6);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.popover-value {
  color: var(--accent-color, #5dff93);
  font-variant-numeric: tabular-nums;
}

.popover-loop-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.loop-btn {
  font-size: 0.64rem;
  padding: 4px 2px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 4px;
  background: #24272f;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: background 100ms ease, border-color 100ms ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.loop-btn-active {
  background: rgba(0, 255, 136, 0.15);
  border-color: var(--accent-color, #5dff93);
  color: var(--accent-color, #5dff93);
}

.popover-slider {
  width: 100%;
  accent-color: var(--accent-color, #5dff93);
}

.popover-actions {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.popover-apply {
  flex: 1;
  font-size: 0.7rem;
  padding: 6px;
  border-radius: 6px;
  border: 1px solid var(--accent-color, #5dff93);
  background: rgba(0, 255, 136, 0.12);
  color: var(--accent-color, #5dff93);
  cursor: pointer;
  font-weight: 600;
  transition: background 120ms ease;
}

.popover-apply:hover {
  background: rgba(0, 255, 136, 0.25);
}

.popover-clear {
  font-size: 0.7rem;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 80, 80, 0.4);
  background: rgba(255, 60, 60, 0.1);
  color: rgba(255, 100, 100, 0.9);
  cursor: pointer;
  transition: background 120ms ease;
}

.popover-clear:hover {
  background: rgba(255, 60, 60, 0.22);
}

.crossfader-column {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  min-width: 0;
}

.sync-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  background: rgba(36, 39, 47, 0.92);
  color: var(--foreground-color-1);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  padding: 8px 10px;
  transition: border-color 120ms ease, box-shadow 120ms ease,
    background 120ms ease;
}

.sync-toggle-active {
  border-color: var(--accent-color, #5dff93);
  box-shadow: 0 0 16px rgba(93, 255, 147, 0.2);
  background: rgba(31, 122, 56, 0.28);
}

.beat-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.24);
  transform: scale(1);
  transition: transform 120ms ease, background 120ms ease, box-shadow 120ms ease;
}

.beat-indicator-active {
  background: var(--accent-color, #5dff93);
  box-shadow: 0 0 12px rgba(93, 255, 147, 0.75);
  transform: scale(1.7);
}

.crossfader-labels {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--foreground-color-1);
  font-size: 0.75rem;
}

.crossfader {
  writing-mode: bt-lr;
  -webkit-appearance: slider-vertical;
  width: 100%;
  height: 100%;
  min-height: 220px;
}

@media (max-width: 1100px) {
  .clip-launcher {
    grid-template-columns: 1fr;
    grid-template-rows: auto 72px auto;
  }

  .crossfader-column {
    justify-content: center;
  }

  .crossfader-labels {
    flex-direction: row;
    justify-content: space-between;
  }

  .crossfader {
    writing-mode: initial;
    -webkit-appearance: none;
    min-height: 0;
    height: auto;
  }
}
</style>
