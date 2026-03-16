<template>
  <div
    class="clip-launcher"
    v-infoView="{ title: iVTitle, body: iVBody, id: 'Clip Launcher Panel' }"
    v-searchTerms="{
      terms: ['clip', 'launcher', 'deck', 'crossfader'],
      title: 'Clip Launcher',
      type: 'Panel',
    }"
  >
    <section class="deck-column">
      <header class="deck-title">Deck A</header>
      <div class="deck-grid">
        <button
          v-for="slot in flatDeckA"
          :key="slot.id"
          type="button"
          class="clip-slot"
          :class="{ active: slot.active, loaded: Boolean(slot.source) }"
          @click="triggerSlot('A', slot)"
          @contextmenu.prevent="clearSlot('A', slot)"
          @dragenter.prevent
          @dragover.prevent
          @drop.prevent="dropFile('A', slot, $event)"
        >
          <span class="slot-index">{{ slotAddress(slot.id) }}</span>
          <span class="slot-name">{{ slotLabel(slot) }}</span>
        </button>
      </div>
    </section>

    <section class="crossfader-column">
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
          @click="triggerSlot('B', slot)"
          @contextmenu.prevent="clearSlot('B', slot)"
          @dragenter.prevent
          @dragover.prevent
          @drop.prevent="dropFile('B', slot, $event)"
        >
          <span class="slot-index">{{ slotAddress(slot.id) }}</span>
          <span class="slot-name">{{ slotLabel(slot) }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script>
import clipLauncher from "../media-manager/ClipLauncher";

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
    };
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

    triggerSlot(deck, slot) {
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

    dropFile(deck, slot, event) {
      const [file] = event.dataTransfer.files || [];

      if (!file || !clipLauncher.isSupportedFile(file)) {
        return;
      }

      const { row, col } = parseSlotId(slot.id);
      clipLauncher.loadClip(deck, row, col, file);
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
  padding: 6px;
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
  font-size: 0.7rem;
  opacity: 0.7;
}

.slot-name {
  font-size: 0.72rem;
  line-height: 1.2;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.crossfader-column {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  min-width: 0;
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
