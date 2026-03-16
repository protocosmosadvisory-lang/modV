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
    <div
      v-if="popover.visible"
      class="slot-popover"
      :style="popover.style"
      @click.stop
    >
      <div class="popover-title">{{ popover.slotLabel }}</div>

      <template v-if="popover.hasClip">
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
      </template>

      <div class="popover-actions">
        <button
          v-if="popover.hasClip"
          type="button"
          class="popover-apply"
          @click="applyPopover"
        >
          Apply
        </button>
        <button
          v-if="popover.hasMidiBinding"
          type="button"
          class="popover-midi"
          @click="clearPopoverMidiBinding"
        >
          Clear MIDI
        </button>
        <button
          v-if="popover.hasClip"
          type="button"
          class="popover-clear"
          @click="clearPopoverSlot"
        >
          Clear
        </button>
      </div>
    </div>

    <section
      class="deck-column"
      :class="{ 'folder-drag-over': folderDragOver === 'A' }"
      @dragenter.prevent="folderDragOver = 'A'"
      @dragleave="onDeckDragLeave('A', $event)"
      @dragover.prevent
      @drop.prevent="dropFolderOnDeck('A', $event)"
    >
      <header class="deck-header">
        <span class="deck-title">Deck A</span>
        <div class="master-speed-btns">
          <button
            v-for="s in speedPresets"
            :key="s.value"
            type="button"
            class="speed-preset-btn"
            :class="{ 'speed-preset-active': masterSpeedA === s.value }"
            @click="setMasterSpeed('A', s.value)"
          >
            {{ s.label }}
          </button>
        </div>
        <button
          type="button"
          class="deck-stop-btn"
          :class="{ 'deck-stop-active': isDeckPlaying('A') }"
          title="Stop Deck A"
          @click="stopDeck('A')"
        >
          ■
        </button>
        <button
          type="button"
          class="sync-toggle midi-toggle"
          :class="{ 'sync-toggle-active': midiLearnDeck === 'A' }"
          @click="toggleMidiLearnMode('A')"
        >
          MIDI
        </button>
      </header>
      <div class="deck-grid">
        <button
          v-for="slot in flatDeckA"
          :key="slot.id"
          type="button"
          class="clip-slot"
          :class="slotClasses('A', slot)"
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
          <span v-if="hasMidiBinding('A', slot)" class="slot-midi-dot"></span>
          <span class="slot-index">{{ slotAddress(slot.id) }}</span>
          <span v-if="showEmptyIcon('A', slot)" class="slot-empty-icon">+</span>
          <span class="slot-name" :class="{ overlay: Boolean(slot.thumbnail) }">
            {{ slotDisplayLabel("A", slot) }}
          </span>
          <span
            v-if="slot.source && !isPendingLearnSlot('A', slot)"
            class="slot-meta"
            >{{ slotMeta(slot) }}</span
          >
          <div
            v-if="slot.active"
            class="slot-progress"
            :style="{ width: playbackProgressA * 100 + '%' }"
          ></div>
        </button>
      </div>
    </section>

    <section class="crossfader-column">
      <canvas ref="previewCanvas" class="output-preview"></canvas>

      <!-- Row scene triggers: fire first loaded clip in each row across both decks -->
      <div class="row-triggers">
        <button
          v-for="row in 8"
          :key="row - 1"
          type="button"
          class="row-trigger-btn"
          :class="{ 'row-trigger-active': isRowActive(row - 1) }"
          :title="`Trigger row ${row} on both decks`"
          @click="triggerRow(row - 1)"
        >
          {{ row }}
        </button>
      </div>

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
        <span>A {{ Math.round((1 - crossfader) * 100) }}%</span>
        <button
          type="button"
          class="cf-midi-btn"
          :class="{
            'cf-midi-active': hasCrossfaderBinding,
            'cf-midi-learning': crossfaderLearning,
          }"
          :title="
            hasCrossfaderBinding
              ? 'Click to clear crossfader MIDI'
              : 'Click to map MIDI CC to crossfader'
          "
          @click="toggleCrossfaderMidi"
        >
          {{ crossfaderLearning ? "…" : "CC" }}
        </button>
        <span>B {{ Math.round(crossfader * 100) }}%</span>
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
      <button
        class="sync-toggle lfo-toggle"
        :class="{ 'sync-toggle-active': lfoActive }"
        type="button"
        @click="toggleLfo"
      >
        <span>LFO</span>
        <span class="lfo-rate-label">{{ lfoRateLabel }}</span>
      </button>
      <div v-if="lfoActive" class="lfo-rate-row">
        <span class="popover-label">Rate</span>
        <input
          type="range"
          class="popover-slider"
          min="0.1"
          max="4"
          step="0.1"
          :value="lfoRate"
          @input="lfoRate = parseFloat($event.target.value)"
        />
      </div>
    </section>

    <section
      class="deck-column"
      :class="{ 'folder-drag-over': folderDragOver === 'B' }"
      @dragenter.prevent="folderDragOver = 'B'"
      @dragleave="onDeckDragLeave('B', $event)"
      @dragover.prevent
      @drop.prevent="dropFolderOnDeck('B', $event)"
    >
      <header class="deck-header">
        <span class="deck-title">Deck B</span>
        <div class="master-speed-btns">
          <button
            v-for="s in speedPresets"
            :key="s.value"
            type="button"
            class="speed-preset-btn"
            :class="{ 'speed-preset-active': masterSpeedB === s.value }"
            @click="setMasterSpeed('B', s.value)"
          >
            {{ s.label }}
          </button>
        </div>
        <button
          type="button"
          class="deck-stop-btn"
          :class="{ 'deck-stop-active': isDeckPlaying('B') }"
          title="Stop Deck B"
          @click="stopDeck('B')"
        >
          ■
        </button>
        <button
          type="button"
          class="sync-toggle midi-toggle"
          :class="{ 'sync-toggle-active': midiLearnDeck === 'B' }"
          @click="toggleMidiLearnMode('B')"
        >
          MIDI
        </button>
      </header>
      <div class="deck-grid">
        <button
          v-for="slot in flatDeckB"
          :key="slot.id"
          type="button"
          class="clip-slot"
          :class="slotClasses('B', slot)"
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
          <span v-if="hasMidiBinding('B', slot)" class="slot-midi-dot"></span>
          <span class="slot-index">{{ slotAddress(slot.id) }}</span>
          <span v-if="showEmptyIcon('B', slot)" class="slot-empty-icon">+</span>
          <span class="slot-name" :class="{ overlay: Boolean(slot.thumbnail) }">
            {{ slotDisplayLabel("B", slot) }}
          </span>
          <span
            v-if="slot.source && !isPendingLearnSlot('B', slot)"
            class="slot-meta"
            >{{ slotMeta(slot) }}</span
          >
          <div
            v-if="slot.active"
            class="slot-progress"
            :style="{ width: playbackProgressB * 100 + '%' }"
          ></div>
        </button>
      </div>
    </section>
  </div>
</template>

<script>
import deckMixer from "../application/DeckMixer";
import midiBindingService from "../application/MidiBindingService";
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
      playbackProgress: 0,
      playbackProgressA: 0,
      playbackProgressB: 0,
      progressInterval: null,
      previewInterval: null,
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
        hasClip: false,
        hasMidiBinding: false,
        style: {},
      },
      longPress: {
        timer: null,
        triggered: false,
        deck: null,
        slot: null,
        event: null,
      },
      midiLearnDeck: null,
      pendingMidiSlot: null,
      folderDragOver: null,
      crossfaderLearning: false,
      lfoActive: false,
      lfoRate: 0.5,
      lfoPhase: 0,
      lfoInterval: null,
      masterSpeedA: 1.0,
      masterSpeedB: 1.0,
      speedPresets: [
        { label: "¼", value: 0.25 },
        { label: "½", value: 0.5 },
        { label: "1×", value: 1.0 },
        { label: "2×", value: 2.0 },
        { label: "4×", value: 4.0 },
      ],
    };
  },

  mounted() {
    this.lastKickState = Boolean(this.$modV?.store?.state?.beats?.kick);
    this.beatPollInterval = setInterval(this.pollBeatState, 1000 / 60);
    this.progressInterval = setInterval(() => {
      this.playbackProgressA = deckMixer.playerA.progress;
      this.playbackProgressB = deckMixer.playerB.progress;
      this.playbackProgress = deckMixer.progress;
    }, 100);
    this.previewInterval = setInterval(this.drawOutputPreview, 1000 / 30);
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
    clearInterval(this.progressInterval);
    this.progressInterval = null;
    clearInterval(this.previewInterval);
    this.previewInterval = null;
    clearTimeout(this.beatPulseTimeout);
    this.beatPulseTimeout = null;
    if (this.stopListeningForBeatSyncMode) {
      this.stopListeningForBeatSyncMode();
      this.stopListeningForBeatSyncMode = null;
    }
    document.removeEventListener("click", this.closePopover);
    document.removeEventListener("keydown", this.onKeyDown);
    this.cancelLongPress();
    this.cancelMidiLearnMode();
    this.stopLfo();
  },

  computed: {
    decks() {
      return this.$store.state["clip-launcher"].decks;
    },

    crossfader() {
      return this.$store.state["clip-launcher"].crossfader;
    },

    midiBindings() {
      return this.$store.state["midi-bindings"]?.bindings || {};
    },

    flatDeckA() {
      return flattenDeck(this.decks.A);
    },

    flatDeckB() {
      return flattenDeck(this.decks.B);
    },

    lfoRateLabel() {
      return `${this.lfoRate.toFixed(1)}Hz`;
    },

    hasCrossfaderBinding() {
      return Boolean(midiBindingService.crossfaderBinding);
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

    slotHasPlayableSource(slot) {
      return Boolean(slot.source?.url);
    },

    slotDisplayLabel(deck, slot) {
      if (this.isPendingLearnSlot(deck, slot)) {
        return "press pad";
      }

      return slot.source ? this.slotLabel(slot) : "";
    },

    showEmptyIcon(deck, slot) {
      return !slot.source && !this.isPendingLearnSlot(deck, slot);
    },

    slotMeta(slot) {
      if (slot.source && !this.slotHasPlayableSource(slot)) {
        return "not loaded";
      }

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
      if (!thumb || !/^(data:image\/|blob:)/.test(thumb)) {
        return null;
      }

      return {
        backgroundImage: `linear-gradient(to top, rgba(0, 0, 0, 0.82), rgba(0, 0, 0, 0.12)), url(${thumb})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    },

    slotClasses(deck, slot) {
      return {
        active: slot.active,
        loaded: this.slotHasPlayableSource(slot),
        placeholder: Boolean(slot.source) && !this.slotHasPlayableSource(slot),
        "midi-learn-mode": this.midiLearnDeck === deck,
        "clip-slot-pending-midi": this.isPendingLearnSlot(deck, slot),
      };
    },

    bindingKey(deviceId, channel, note) {
      return `${deviceId}:${channel}:${note}`;
    },

    getBindingKeyForSlot(deck, slot) {
      const { row, col } = parseSlotId(slot.id);
      const entries = Object.entries(this.midiBindings);

      for (let i = 0, len = entries.length; i < len; i++) {
        const [key, binding] = entries[i];

        if (
          binding.deck === deck &&
          binding.row === row &&
          binding.col === col
        ) {
          return key;
        }
      }

      return null;
    },

    hasMidiBinding(deck, slot) {
      return Boolean(this.getBindingKeyForSlot(deck, slot));
    },

    isPendingLearnSlot(deck, slot) {
      if (!this.pendingMidiSlot) {
        return false;
      }

      const { row, col } = parseSlotId(slot.id);

      return (
        this.pendingMidiSlot.deck === deck &&
        this.pendingMidiSlot.row === row &&
        this.pendingMidiSlot.col === col
      );
    },

    drawOutputPreview() {
      const previewCanvas = this.$refs.previewCanvas;
      const sourceCanvas = deckMixer.canvas;

      if (!previewCanvas) {
        return;
      }

      const ctx = previewCanvas.getContext("2d");
      if (!ctx) {
        return;
      }

      const cssWidth = previewCanvas.clientWidth;
      const cssHeight = previewCanvas.clientHeight;

      if (cssWidth > 0 && previewCanvas.width !== cssWidth) {
        previewCanvas.width = cssWidth;
      }

      if (cssHeight > 0 && previewCanvas.height !== cssHeight) {
        previewCanvas.height = cssHeight;
      }

      if (!sourceCanvas || !sourceCanvas.width || !sourceCanvas.height) {
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        return;
      }

      ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      ctx.drawImage(
        sourceCanvas,
        0,
        0,
        previewCanvas.width,
        previewCanvas.height
      );
    },

    startLongPress(deck, slot, event) {
      this.cancelLongPress();
      this.longPress.triggered = false;
      this.longPress.deck = deck;
      this.longPress.slot = slot;
      this.longPress.event = event;
      this.longPress.timer = setTimeout(() => {
        if (
          this.slotHasPlayableSource(slot) ||
          this.hasMidiBinding(deck, slot)
        ) {
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

      if (this.midiLearnDeck === deck) {
        this.learnSlotBinding(deck, slot);
        return;
      }

      if (!this.slotHasPlayableSource(slot)) {
        this.openFilePicker(deck, slot);
        return;
      }

      const { row, col } = parseSlotId(slot.id);
      clipLauncher.triggerClip(deck, row, col);
    },

    openFilePicker(deck, slot) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";

      input.addEventListener(
        "change",
        () => {
          const file = input.files && input.files[0];

          if (!file || !clipLauncher.isSupportedFile(file)) {
            return;
          }

          const { row, col } = parseSlotId(slot.id);
          clipLauncher.loadClip(deck, row, col, file);
        },
        { once: true }
      );

      input.click();
    },

    clearSlot(deck, slot) {
      const { row, col } = parseSlotId(slot.id);
      clipLauncher.clearSlot(deck, row, col);
    },

    setCrossfader(value) {
      clipLauncher.setCrossfader(value);
    },

    async toggleCrossfaderMidi() {
      if (this.hasCrossfaderBinding) {
        midiBindingService.clearCrossfaderCCBinding();
        return;
      }

      if (this.crossfaderLearning) {
        return;
      }

      this.crossfaderLearning = true;

      try {
        const msg = await midiBindingService.startCrossfaderLearn();

        if (msg) {
          midiBindingService.setCrossfaderCCBinding({
            deviceId: msg.deviceId,
            channel: msg.channel,
            cc: msg.note,
          });
        }
      } catch (_e) {
        // cancelled — no-op
      } finally {
        this.crossfaderLearning = false;
      }
    },

    toggleLfo() {
      if (this.lfoActive) {
        this.stopLfo();
      } else {
        this.startLfo();
      }
    },

    startLfo() {
      this.lfoActive = true;
      this.lfoPhase = 0;

      const tick = () => {
        if (!this.lfoActive) {
          return;
        }

        this.lfoPhase += (2 * Math.PI * this.lfoRate) / 60;
        const value = (Math.sin(this.lfoPhase) + 1) / 2;

        clipLauncher.setCrossfader(value);
      };

      this.lfoInterval = setInterval(tick, 1000 / 60);
    },

    stopLfo() {
      this.lfoActive = false;

      if (this.lfoInterval) {
        clearInterval(this.lfoInterval);
        this.lfoInterval = null;
      }
    },

    isDeckPlaying(deck) {
      const player = deck === "A" ? deckMixer.playerA : deckMixer.playerB;

      return player.isPlaying;
    },

    stopDeck(deck) {
      const player = deck === "A" ? deckMixer.playerA : deckMixer.playerB;
      player.stop();

      // Passing row/col of -1 sets all slots in this deck to active=false
      this.$store.commit("clip-launcher/TRIGGER_CLIP", {
        deck,
        row: -1,
        col: -1,
      });
    },

    setMasterSpeed(deck, speed) {
      if (deck === "A") {
        this.masterSpeedA = speed;
      } else {
        this.masterSpeedB = speed;
      }

      deckMixer.setMasterSpeed(deck, speed);
    },

    isRowActive(row) {
      return ["A", "B"].some((deck) => {
        const deckSlots = this.decks[deck]?.[row];

        return deckSlots && deckSlots.some((slot) => slot.active);
      });
    },

    triggerRow(row) {
      const decks = ["A", "B"];

      for (let i = 0, len = decks.length; i < len; i++) {
        const deck = decks[i];
        const deckSlots = this.decks[deck]?.[row];

        if (!deckSlots) {
          continue;
        }

        const firstLoaded = deckSlots.find(
          (slot) => slot.source && slot.source.url
        );

        if (firstLoaded) {
          const { row: r, col: c } = parseSlotId(firstLoaded.id);

          clipLauncher.triggerClip(deck, r, c);
        }
      }
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
      const files = event.dataTransfer.files || [];
      const videoFiles = [];

      for (let i = 0; i < files.length; i++) {
        if (clipLauncher.isSupportedFile(files[i])) {
          videoFiles.push(files[i]);
        }
      }

      if (videoFiles.length === 0) {
        return;
      }

      if (videoFiles.length === 1) {
        const { row, col } = parseSlotId(slot.id);
        clipLauncher.loadClip(deck, row, col, videoFiles[0]);
        return;
      }

      // Multiple files dropped onto a slot — fill from this slot forward
      const { row: startRow, col: startCol } = parseSlotId(slot.id);
      let slotIndex = startRow * 8 + startCol;

      for (
        let i = 0;
        i < videoFiles.length && slotIndex < 64;
        i++, slotIndex++
      ) {
        const r = Math.floor(slotIndex / 8);
        const c = slotIndex % 8;
        clipLauncher.loadClip(deck, r, c, videoFiles[i]);
      }
    },

    onDeckDragLeave(deck, event) {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        if (this.folderDragOver === deck) {
          this.folderDragOver = null;
        }
      }
    },

    dropFolderOnDeck(deck, event) {
      this.folderDragOver = null;
      const items = event.dataTransfer.items || [];
      const videoFiles = [];

      // Collect all files from the drop (including from folders via getAsFile)
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item.kind !== "file") {
          continue;
        }

        const file = item.getAsFile();

        if (file && clipLauncher.isSupportedFile(file)) {
          videoFiles.push(file);
        }
      }

      if (videoFiles.length === 0) {
        return;
      }

      // Sort by name for consistent ordering
      videoFiles.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
      );

      for (let i = 0; i < videoFiles.length && i < 64; i++) {
        const r = Math.floor(i / 8);
        const c = i % 8;
        clipLauncher.loadClip(deck, r, c, videoFiles[i]);
      }
    },

    openPopover(deck, slot, event) {
      const hasMidiBinding = this.hasMidiBinding(deck, slot);

      if (!this.slotHasPlayableSource(slot) && !hasMidiBinding) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const containerRect = this.$el.getBoundingClientRect();

      let top = rect.top - containerRect.top + rect.height + 4;
      let left = rect.left - containerRect.left;

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
        slotLabel: slot.source?.name || `Slot ${this.slotAddress(slot.id)}`,
        loopMode: slot.loopMode || "loop",
        speed: slot.speed || 1.0,
        hasClip: this.slotHasPlayableSource(slot),
        hasMidiBinding,
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
      if (!this.popover.slot || !this.popover.hasClip) {
        return;
      }

      const { deck, slot, loopMode, speed } = this.popover;
      const { row, col } = parseSlotId(slot.id);

      clipLauncher.updateSlotSettings(deck, row, col, { loopMode, speed });
      this.closePopover();
    },

    clearPopoverSlot() {
      if (!this.popover.slot || !this.popover.hasClip) {
        return;
      }

      const { deck, slot } = this.popover;
      const { row, col } = parseSlotId(slot.id);

      this.closePopover();
      clipLauncher.clearSlot(deck, row, col);
    },

    clearPopoverMidiBinding() {
      if (!this.popover.slot || !this.popover.deck) {
        return;
      }

      const key = this.getBindingKeyForSlot(
        this.popover.deck,
        this.popover.slot
      );

      if (key) {
        this.$store.commit("midi-bindings/REMOVE_BINDING", key);
      }

      this.closePopover();
    },

    toggleMidiLearnMode(deck) {
      if (this.midiLearnDeck === deck) {
        this.cancelMidiLearnMode();
        return;
      }

      this.closePopover();
      midiBindingService.cancelLearn();
      this.pendingMidiSlot = null;
      this.midiLearnDeck = deck;
    },

    cancelMidiLearnMode() {
      midiBindingService.cancelLearn();
      this.pendingMidiSlot = null;
      this.midiLearnDeck = null;
    },

    async learnSlotBinding(deck, slot) {
      const { row, col } = parseSlotId(slot.id);
      const pendingSlot = { deck, row, col };
      const existingKey = this.getBindingKeyForSlot(deck, slot);

      midiBindingService.cancelLearn();
      this.pendingMidiSlot = pendingSlot;

      try {
        const { deviceId, channel, note } =
          await midiBindingService.startLearn();

        if (existingKey) {
          this.$store.commit("midi-bindings/REMOVE_BINDING", existingKey);
        }

        this.$store.commit("midi-bindings/SET_BINDING", {
          key: this.bindingKey(deviceId, channel, note),
          deck,
          row,
          col,
        });
      } catch (_error) {
        // Learn cancellation is expected during deck toggle or slot reselection.
      } finally {
        if (
          this.pendingMidiSlot &&
          this.pendingMidiSlot.deck === pendingSlot.deck &&
          this.pendingMidiSlot.row === pendingSlot.row &&
          this.pendingMidiSlot.col === pendingSlot.col
        ) {
          this.pendingMidiSlot = null;
        }
      }
    },

    onKeyDown(e) {
      if (e.key !== "Escape") {
        return;
      }

      if (this.popover.visible) {
        this.closePopover();
      }

      if (this.midiLearnDeck) {
        this.cancelMidiLearnMode();
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
  border-radius: 8px;
  transition: box-shadow 120ms ease;
}

.deck-column.folder-drag-over {
  box-shadow: inset 0 0 0 2px var(--accent-color, #00ff88),
    0 0 20px rgba(0, 255, 136, 0.15);
}

.deck-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  flex-wrap: wrap;
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
  position: relative;
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

.clip-slot.placeholder {
  background: linear-gradient(
    180deg,
    rgba(124, 58, 255, 0.16),
    rgba(36, 39, 47, 0.96)
  );
  border-color: rgba(124, 58, 255, 0.4);
}

.clip-slot.active {
  background: #1f7a38;
  border-color: #5dff93;
}

.clip-slot.midi-learn-mode {
  border-color: rgba(124, 58, 255, 0.52);
  box-shadow: inset 0 0 0 1px rgba(124, 58, 255, 0.2);
}

.clip-slot.midi-learn-mode::after {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: 8px;
  border: 2px solid rgba(124, 58, 255, 0.45);
  opacity: 0.45;
  animation: midi-learn-ring 1.35s ease-in-out infinite;
  pointer-events: none;
}

.clip-slot.clip-slot-pending-midi {
  background: rgba(124, 58, 255, 0.3);
  border-color: #b291ff;
  animation: midi-pending-pulse 1s ease-in-out infinite;
}

.slot-midi-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #7c3aff;
  box-shadow: 0 0 10px rgba(124, 58, 255, 0.85);
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

.slot-empty-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.1rem;
  opacity: 0.18;
  pointer-events: none;
  line-height: 1;
  transition: opacity 120ms ease;
}

.clip-slot:hover .slot-empty-icon {
  opacity: 0.45;
}

.slot-meta {
  font-size: 0.6rem;
  opacity: 0.7;
  color: var(--accent-color, #5dff93);
  line-height: 1;
}

.slot-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: var(--accent-color, #5dff93);
  border-radius: 0 0 6px 6px;
  transition: width 100ms linear;
  pointer-events: none;
}

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

.popover-midi {
  font-size: 0.7rem;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(124, 58, 255, 0.45);
  background: rgba(124, 58, 255, 0.12);
  color: #cdbdff;
  cursor: pointer;
  transition: background 120ms ease;
}

.popover-midi:hover {
  background: rgba(124, 58, 255, 0.24);
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

.output-preview {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #000;
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

.midi-toggle.sync-toggle-active {
  border-color: #7c3aff;
  box-shadow: 0 0 16px rgba(124, 58, 255, 0.25);
  background: rgba(124, 58, 255, 0.2);
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

.cf-midi-btn {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: background 100ms ease, border-color 100ms ease;
}

.cf-midi-active {
  border-color: #7c3aff;
  color: #a78bff;
  background: rgba(124, 58, 255, 0.15);
}

.cf-midi-learning {
  border-color: rgba(124, 58, 255, 0.6);
  animation: midi-learn-pulse 700ms ease-in-out infinite;
}

@keyframes midi-learn-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.crossfader {
  writing-mode: bt-lr;
  -webkit-appearance: slider-vertical;
  width: 100%;
  height: 100%;
  min-height: 220px;
}

.lfo-toggle {
  margin-top: 4px;
  gap: 6px;
}

.lfo-rate-label {
  font-size: 0.62rem;
  opacity: 0.75;
  font-variant-numeric: tabular-nums;
}

.lfo-rate-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
}

@keyframes midi-learn-ring {
  0% {
    opacity: 0.25;
    transform: scale(0.98);
  }

  50% {
    opacity: 0.8;
    transform: scale(1.02);
  }

  100% {
    opacity: 0.25;
    transform: scale(0.98);
  }
}

@keyframes midi-pending-pulse {
  0% {
    background: rgba(124, 58, 255, 0.16);
    box-shadow: 0 0 0 rgba(124, 58, 255, 0.1);
  }

  50% {
    background: rgba(124, 58, 255, 0.36);
    box-shadow: 0 0 18px rgba(124, 58, 255, 0.28);
  }

  100% {
    background: rgba(124, 58, 255, 0.16);
    box-shadow: 0 0 0 rgba(124, 58, 255, 0.1);
  }
}

/* Row scene triggers */
.row-triggers {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
}

.row-trigger-btn {
  aspect-ratio: 1 / 1;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(36, 39, 47, 0.9);
  color: rgba(255, 255, 255, 0.45);
  border-radius: 5px;
  font-size: 0.62rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease,
    box-shadow 80ms ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.row-trigger-btn:hover {
  border-color: rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.06);
}

.row-trigger-btn:active {
  transform: scale(0.92);
}

.row-trigger-active {
  border-color: var(--grackle-accent, #00ff88);
  color: var(--grackle-accent, #00ff88);
  background: rgba(0, 255, 136, 0.1);
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.15);
}

/* Deck stop button */
.deck-stop-btn {
  padding: 2px 7px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.35);
  border-radius: 4px;
  font-size: 0.55rem;
  cursor: pointer;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
  line-height: 1;
}

.deck-stop-btn:hover {
  border-color: rgba(255, 80, 80, 0.5);
  color: rgba(255, 100, 100, 0.8);
  background: rgba(255, 60, 60, 0.08);
}

.deck-stop-btn:active {
  transform: scale(0.9);
}

.deck-stop-active {
  border-color: rgba(255, 80, 80, 0.6);
  color: rgba(255, 100, 100, 0.9);
  background: rgba(255, 60, 60, 0.1);
}

/* Per-deck master speed presets */
.master-speed-btns {
  display: flex;
  gap: 3px;
  flex: 1;
  justify-content: center;
}

.speed-preset-btn {
  padding: 2px 5px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
}

.speed-preset-btn:hover {
  border-color: rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.7);
}

.speed-preset-active {
  border-color: var(--grackle-accent, #00ff88);
  color: var(--grackle-accent, #00ff88);
  background: rgba(0, 255, 136, 0.08);
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
