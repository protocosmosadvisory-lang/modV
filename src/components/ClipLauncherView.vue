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

      <template v-if="popover.hasClip">
        <label class="popover-label">
          BPM Sync
          <span v-if="popover.bpmSyncBeats > 0" class="popover-value">
            {{ popoverBpmPreview }}
          </span>
        </label>
        <div class="popover-loop-buttons">
          <button
            v-for="b in bpmSyncOptions"
            :key="b.value"
            type="button"
            class="loop-btn"
            :class="{ 'loop-btn-active': popover.bpmSyncBeats === b.value }"
            @click="popover.bpmSyncBeats = b.value"
          >
            {{ b.label }}
          </button>
        </div>
      </template>

      <template v-if="popover.hasClip">
        <label class="popover-label">
          IN
          <span class="popover-value"
            >{{ Math.round(popover.loopIn * 100) }}%</span
          >
        </label>
        <input
          type="range"
          class="popover-slider"
          min="0"
          max="1"
          step="0.01"
          :value="popover.loopIn"
          @input="
            popover.loopIn = Math.min(
              parseFloat($event.target.value),
              popover.loopOut - 0.01
            )
          "
        />
        <label class="popover-label">
          OUT
          <span class="popover-value"
            >{{ Math.round(popover.loopOut * 100) }}%</span
          >
        </label>
        <input
          type="range"
          class="popover-slider"
          min="0"
          max="1"
          step="0.01"
          :value="popover.loopOut"
          @input="
            popover.loopOut = Math.max(
              parseFloat($event.target.value),
              popover.loopIn + 0.01
            )
          "
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
          v-if="popover.hasClip"
          type="button"
          class="popover-copy"
          :title="`Copy clip to same slot on Deck ${
            popover.deck === 'A' ? 'B' : 'A'
          }`"
          @click="copySlotToOtherDeck"
        >
          → {{ popover.deck === "A" ? "B" : "A" }}
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
          class="deck-freeze-btn"
          :class="{ 'deck-freeze-active': frozenA }"
          title="Freeze / hold current frame"
          @click="toggleFreeze('A')"
        >
          ❄
        </button>
        <button
          type="button"
          class="deck-cam-btn"
          :class="{ 'deck-cam-active': camA }"
          title="Webcam live input for Deck A"
          @click="toggleCam('A')"
        >
          CAM
        </button>
        <button
          type="button"
          class="deck-mirror-btn"
          :class="{ 'deck-mirror-active': mirrorA }"
          title="Flip Deck A horizontally"
          @click="toggleMirror('A')"
        >
          ↔
        </button>
        <button
          type="button"
          class="deck-tile-btn"
          :class="{ 'deck-tile-active': tileModeA === '2x2' }"
          title="2×2 tile grid for Deck A"
          @click="cycleTileMode('A')"
        >
          {{ tileModeA === "mirror4" ? "⊞M" : tileModeA === "2x2" ? "⊞" : "⊡" }}
        </button>
        <button
          type="button"
          class="deck-stutter-btn"
          :class="{ 'deck-stutter-active': stutteringDeck === 'A' }"
          title="Stutter — hold to loop current frame rapidly"
          @mousedown.prevent="startStutter('A')"
          @mouseup="stopStutter"
          @mouseleave="stopStutter"
          @touchstart.prevent="startStutter('A')"
          @touchend.prevent="stopStutter"
        >
          STUT
        </button>
        <button
          type="button"
          class="deck-ramp-btn"
          :class="{ 'deck-ramp-active': rampingDeck === 'A' && rampDir > 0 }"
          title="Speed ramp UP — hold to accelerate"
          @mousedown.prevent="startRamp('A', 1)"
          @mouseup="stopRamp"
          @mouseleave="stopRamp"
          @touchstart.prevent="startRamp('A', 1)"
          @touchend.prevent="stopRamp"
        >
          R+
        </button>
        <button
          type="button"
          class="deck-ramp-btn"
          :class="{ 'deck-ramp-active': rampingDeck === 'A' && rampDir < 0 }"
          title="Speed ramp DOWN — hold to decelerate"
          @mousedown.prevent="startRamp('A', -1)"
          @mouseup="stopRamp"
          @mouseleave="stopRamp"
          @touchstart.prevent="startRamp('A', -1)"
          @touchend.prevent="stopRamp"
        >
          R-
        </button>
        <button
          type="button"
          class="deck-fx-toggle"
          :class="{ 'deck-fx-open': showFxA }"
          title="Toggle color effects"
          @click="showFxA = !showFxA"
        >
          FX
        </button>
        <button
          type="button"
          class="deck-rev-btn"
          :class="{ 'deck-rev-active': reversedA }"
          title="Reverse playback"
          @click="toggleReverse('A')"
        >
          ◀◀
        </button>
        <button
          type="button"
          class="deck-qbeat-btn"
          :class="{ 'deck-qbeat-active': quantizeA }"
          title="Quantize launch to next beat"
          @click="quantizeA = !quantizeA"
        >
          Q
        </button>
        <button
          type="button"
          class="deck-auto-btn"
          :class="{ 'deck-auto-active': autoTriggerA }"
          title="Auto-trigger random clips on beat"
          @click="toggleAutoTrigger('A')"
        >
          AUTO
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
      <div v-if="showFxA" class="deck-fx-row">
        <label class="fx-label">BRI</label>
        <input
          type="range"
          class="fx-slider"
          min="0"
          max="3"
          step="0.05"
          :value="fxA.brightness"
          @input="updateFx('A', 'brightness', $event.target.value)"
        />
        <label class="fx-label">CON</label>
        <input
          type="range"
          class="fx-slider"
          min="0"
          max="3"
          step="0.05"
          :value="fxA.contrast"
          @input="updateFx('A', 'contrast', $event.target.value)"
        />
        <label class="fx-label">HUE</label>
        <input
          type="range"
          class="fx-slider"
          min="-180"
          max="180"
          step="1"
          :value="fxA.hue"
          @input="updateFx('A', 'hue', $event.target.value)"
        />
        <label class="fx-label">SAT</label>
        <input
          type="range"
          class="fx-slider"
          min="0"
          max="3"
          step="0.05"
          :value="fxA.saturation"
          @input="updateFx('A', 'saturation', $event.target.value)"
        />
        <label class="fx-label">OPA</label>
        <input
          type="range"
          class="fx-slider"
          min="0"
          max="1"
          step="0.01"
          :value="opacityA"
          @input="setDeckOpacity('A', $event.target.value)"
        />
        <label class="fx-label">BLR</label>
        <input
          type="range"
          class="fx-slider"
          min="0"
          max="20"
          step="0.5"
          :value="fxA.blur"
          @input="updateFx('A', 'blur', $event.target.value)"
        />
        <label class="fx-label">G</label>
        <input
          type="range"
          class="fx-slider"
          min="0"
          max="1"
          step="0.01"
          :value="fxA.grayscale"
          @input="updateFx('A', 'grayscale', $event.target.value)"
        />
        <label class="fx-label">INV</label>
        <input
          type="range"
          class="fx-slider"
          min="0"
          max="1"
          step="0.01"
          :value="fxA.invert"
          @input="updateFx('A', 'invert', $event.target.value)"
        />
        <label class="fx-label">SEP</label>
        <input
          type="range"
          class="fx-slider"
          min="0"
          max="1"
          step="0.01"
          :value="fxA.sepia"
          @input="updateFx('A', 'sepia', $event.target.value)"
        />
        <label class="fx-label">RGB</label>
        <input
          type="range"
          class="fx-slider fx-slider-chroma"
          min="0"
          max="30"
          step="0.5"
          :value="chromaA"
          @input="setChroma('A', $event.target.value)"
          title="Chromatic aberration — RGB split offset"
        />
        <button class="fx-reset-btn" @click="resetFx('A')">↺</button>
      </div>
      <div v-if="showFxA" class="deck-grade-row">
        <button
          v-for="grade in colorGrades"
          :key="grade.id"
          type="button"
          class="grade-btn"
          :title="grade.label"
          @click="applyGrade('A', grade)"
        >
          {{ grade.label }}
        </button>
      </div>
      <div v-if="showFxA" class="deck-transform-row">
        <label class="fx-label">X</label>
        <input
          type="range"
          class="fx-slider"
          min="-1"
          max="1"
          step="0.01"
          :value="transformA.posX"
          @input="updateTransform('A', 'posX', $event.target.value)"
          @dblclick="resetTransform('A', 'posX')"
        />
        <label class="fx-label">Y</label>
        <input
          type="range"
          class="fx-slider"
          min="-1"
          max="1"
          step="0.01"
          :value="transformA.posY"
          @input="updateTransform('A', 'posY', $event.target.value)"
          @dblclick="resetTransform('A', 'posY')"
        />
        <label class="fx-label">SCL</label>
        <input
          type="range"
          class="fx-slider"
          min="0.1"
          max="3"
          step="0.05"
          :value="transformA.scale"
          @input="updateTransform('A', 'scale', $event.target.value)"
          @dblclick="resetTransform('A', 'scale')"
        />
        <button
          class="fx-reset-btn"
          @click="resetTransformAll('A')"
          title="Reset X/Y/Scale"
        >
          ↺
        </button>
      </div>
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
          @contextmenu.prevent="openSlotMenu('A', slot, $event)"
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
      <canvas
        ref="previewCanvas"
        class="output-preview"
        title="Click to seek dominant deck"
        @click="seekFromPreviewClick"
      ></canvas>

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

      <!-- Column triggers: fire clip at column across both decks -->
      <div class="col-triggers">
        <button
          v-for="col in 8"
          :key="col - 1"
          type="button"
          class="col-trigger-btn"
          :title="`Trigger column ${col} on both decks`"
          @click="triggerCol(col - 1)"
        >
          ▾{{ col }}
        </button>
      </div>

      <!-- Stutter beat division -->
      <div class="auto-div-row">
        <span class="auto-div-label">STUT</span>
        <button
          v-for="d in stutterDivisions"
          :key="d.value"
          type="button"
          class="auto-div-btn"
          :class="{ 'auto-div-active': stutterDivision === d.value }"
          @click="stutterDivision = d.value"
        >
          {{ d.label }}
        </button>
      </div>

      <!-- Auto-trigger beat division: how many beats between triggers -->
      <div v-if="autoTriggerA || autoTriggerB" class="auto-div-row">
        <span class="auto-div-label">AUTO /</span>
        <button
          v-for="d in autoTriggerDivisions"
          :key="d.value"
          type="button"
          class="auto-div-btn"
          :class="{ 'auto-div-active': autoTriggerDivision === d.value }"
          @click="autoTriggerDivision = d.value"
        >
          {{ d.label }}
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
      <!-- Auto-crossfade -->
      <div class="cf-auto-row">
        <button
          type="button"
          class="cf-auto-btn"
          :class="{ 'cf-auto-active': autoCrossfading }"
          :title="`Auto-sweep crossfader to ${
            crossfader < 0.5 ? 'B (100%)' : 'A (0%)'
          } over ${autoCfDuration}s`"
          @click="triggerAutoCrossfade"
        >
          {{ crossfader &lt; 0.5 ? "A→B" : "B→A" }}
        </button>
        <button
          v-for="d in autoCfDurations"
          :key="d.value"
          type="button"
          class="cf-auto-dur-btn"
          :class="{ 'cf-auto-dur-active': autoCfDuration === d.value }"
          @click="autoCfDuration = d.value"
        >
          {{ d.label }}
        </button>
      </div>

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
      <!-- Solo deck buttons — snap crossfader to 0 or 1 -->
      <div class="solo-btns">
        <button
          type="button"
          class="solo-btn solo-btn-a"
          :class="{ 'solo-btn-active': crossfader === 0 }"
          title="Solo Deck A (snap crossfader to A)"
          @click="soloDeck('A')"
        >
          A ▶
        </button>
        <button
          type="button"
          class="solo-btn solo-btn-b"
          :class="{ 'solo-btn-active': crossfader === 1 }"
          title="Solo Deck B (snap crossfader to B)"
          @click="soloDeck('B')"
        >
          ◀ B
        </button>
      </div>

      <!-- Blend mode selector -->
      <div class="blend-mode-btns">
        <button
          v-for="bm in blendModes"
          :key="bm.value"
          type="button"
          class="blend-mode-btn"
          :class="{ 'blend-mode-active': blendMode === bm.value }"
          :title="bm.label"
          @click="setBlendMode(bm.value)"
        >
          {{ bm.label }}
        </button>
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
      <!-- Master brightness -->
      <div class="master-brightness-row">
        <label class="master-brightness-label">
          BRT {{ Math.round(masterBrightness * 100) }}%
        </label>
        <input
          type="range"
          class="master-brightness-slider"
          min="0"
          max="2"
          step="0.01"
          :value="masterBrightness"
          @input="setMasterBrightness($event.target.value)"
          @dblclick="resetMasterBrightness"
          title="Master brightness (double-click to reset)"
        />
      </div>

      <!-- Blackout / Whiteout -->
      <div class="blackout-row">
        <button
          class="blackout-btn"
          :class="{ 'blackout-active': blackoutOn }"
          type="button"
          title="Blackout (hold B or click)"
          @mousedown="setBlackout(true)"
          @mouseup="setBlackout(false)"
          @mouseleave="setBlackout(false)"
          @touchstart.prevent="setBlackout(true)"
          @touchend.prevent="setBlackout(false)"
        >
          ⬛ BLK
        </button>
        <button
          class="whiteout-btn"
          :class="{ 'whiteout-active': whiteoutOn }"
          type="button"
          title="Whiteout (hold ` or click)"
          @mousedown="setWhiteout(true)"
          @mouseup="setWhiteout(false)"
          @mouseleave="setWhiteout(false)"
          @touchstart.prevent="setWhiteout(true)"
          @touchend.prevent="setWhiteout(false)"
        >
          ⬜ WHT
        </button>
      </div>

      <div class="beat-fx-row">
        <button
          class="sync-toggle beat-flash-toggle"
          :class="{ 'sync-toggle-active': beatFlashEnabled }"
          type="button"
          title="Beat-reactive brightness flash on kick"
          @click="toggleBeatFlash"
        >
          FLASH
        </button>
        <button
          class="sync-toggle beat-zoom-toggle"
          :class="{ 'sync-toggle-active': beatZoomEnabled }"
          type="button"
          title="Beat-reactive zoom pulse on kick"
          @click="toggleBeatZoom"
        >
          ZOOM
        </button>
        <button
          class="sync-toggle beat-trail-toggle"
          :class="{ 'sync-toggle-active': trailEnabled }"
          type="button"
          title="Motion trail / echo feedback"
          @click="toggleTrail"
        >
          TRAIL
        </button>
        <button
          class="sync-toggle beat-strobe-toggle"
          :class="{ 'sync-toggle-active': strobeEnabled }"
          type="button"
          title="Strobe — alternating black frames at set Hz"
          @click="toggleStrobe"
        >
          STRB
        </button>
        <button
          class="sync-toggle beat-glitch-toggle"
          :class="{ 'sync-toggle-active': glitchEnabled }"
          type="button"
          title="Glitch — random horizontal slice displacement"
          @click="toggleGlitch"
        >
          GLCH
        </button>
      </div>
      <!-- Pixelate slider -->
      <div v-if="pixelate > 1 || true" class="pixelate-row">
        <span class="pixelate-label"
          >PIX {{ pixelate > 1 ? pixelate + "×" : "OFF" }}</span
        >
        <input
          type="range"
          class="pixelate-slider"
          min="1"
          max="40"
          step="1"
          :value="pixelate"
          @input="setPixelate($event.target.value)"
          title="Pixelate master output (1 = off)"
        />
      </div>
      <div v-if="strobeEnabled" class="strobe-hz-row">
        <span class="strobe-hz-label">{{ strobeHz }} Hz</span>
        <input
          type="range"
          class="strobe-hz-slider"
          min="0.5"
          max="30"
          step="0.5"
          :value="strobeHz"
          @input="setStrobeHz($event.target.value)"
        />
      </div>
      <div v-if="trailEnabled" class="trail-decay-row">
        <span class="trail-decay-label"
          >DECAY {{ Math.round(trailDecay * 100) }}%</span
        >
        <input
          type="range"
          class="trail-decay-slider"
          min="0"
          max="0.99"
          step="0.01"
          :value="trailDecay"
          @input="setTrailDecay($event.target.value)"
        />
      </div>

      <!-- Master output FX -->
      <div class="master-fx-row">
        <span class="master-fx-label">OUT</span>
        <div class="master-fx-sliders">
          <div class="master-fx-item">
            <span class="master-fx-item-label">CNT</span>
            <input
              type="range"
              class="master-fx-slider"
              min="0"
              max="4"
              step="0.01"
              :value="masterContrast"
              @input="setMasterFxParam('contrast', $event.target.value)"
              @dblclick.prevent="resetMasterFxParam('contrast')"
              title="Master contrast (dbl-click reset)"
            />
          </div>
          <div class="master-fx-item">
            <span class="master-fx-item-label">SAT</span>
            <input
              type="range"
              class="master-fx-slider"
              min="0"
              max="4"
              step="0.01"
              :value="masterSaturation"
              @input="setMasterFxParam('saturation', $event.target.value)"
              @dblclick.prevent="resetMasterFxParam('saturation')"
              title="Master saturation (dbl-click reset)"
            />
          </div>
          <div class="master-fx-item">
            <span class="master-fx-item-label">HUE</span>
            <input
              type="range"
              class="master-fx-slider"
              min="-180"
              max="180"
              step="1"
              :value="masterHue"
              @input="setMasterFxParam('hue', $event.target.value)"
              @dblclick.prevent="resetMasterFxParam('hue')"
              title="Master hue shift (dbl-click reset)"
            />
          </div>
        </div>
      </div>

      <!-- Output resolution selector -->
      <div class="res-row">
        <button
          v-for="r in outputResolutions"
          :key="r.label"
          type="button"
          class="res-btn"
          :class="{ 'res-btn-active': outputResolution === r.label }"
          :title="`Output resolution: ${r.w}x${r.h}`"
          @click="setOutputResolution(r)"
        >
          {{ r.label }}
        </button>
      </div>

      <!-- REC button -->
      <button
        type="button"
        class="rec-btn"
        :class="{ 'rec-btn-active': isRecording }"
        :title="isRecording ? 'Stop recording' : 'Record output as WebM'"
        @click="toggleRecording"
      >
        <span class="rec-dot" />
        {{ isRecording ? formatRecordElapsed(recordElapsed) : "REC" }}
      </button>

      <!-- PANIC: stop everything, reset all effects -->
      <button
        type="button"
        class="panic-btn"
        title="PANIC — stop all playback and reset effects"
        @click="panic"
      >
        !! PANIC !!
      </button>

      <!-- Session save / load -->
      <div class="session-row">
        <button
          type="button"
          class="session-btn"
          title="Save session to JSON file"
          @click="saveSession"
        >
          SAVE
        </button>
        <button
          type="button"
          class="session-btn"
          title="Load session from JSON file"
          @click="$refs.sessionFileInput.click()"
        >
          LOAD
        </button>
        <input
          ref="sessionFileInput"
          type="file"
          accept=".json"
          style="display: none"
          @change="
            loadSession($event.target.files[0]);
            $event.target.value = '';
          "
        />
      </div>

      <!-- Scene presets: hold to save, tap to recall -->
      <button
        class="wizard-help-btn"
        type="button"
        title="Open setup wizard"
        @click="
          showWizard = true;
          wizardStep = 0;
          templatesLoaded = false;
        "
      >
        ?
      </button>
      <div class="scene-presets">
        <span class="scene-presets-label">SCENE</span>
        <div class="scene-preset-grid">
          <button
            v-for="(preset, i) in scenePresets"
            :key="i"
            type="button"
            class="scene-preset-btn"
            :class="{ 'scene-preset-saved': preset !== null }"
            :title="
              preset
                ? `Recall scene ${i + 1} (hold to overwrite)`
                : `Hold to save scene ${i + 1}`
            "
            @mousedown="startPresetLongPress(i)"
            @mouseup="endPresetPress(i)"
            @mouseleave="cancelPresetLongPress"
            @touchstart.prevent="startPresetLongPress(i)"
            @touchend.prevent="endPresetPress(i)"
            @touchcancel="cancelPresetLongPress"
          >
            {{ i + 1 }}
            <span v-if="preset !== null" class="scene-preset-dot"></span>
          </button>
        </div>
      </div>

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
      <div v-if="lfoActive" class="lfo-controls-row">
        <button
          v-for="shape in ['sine', 'triangle', 'square', 'saw']"
          :key="shape"
          type="button"
          class="lfo-shape-btn"
          :class="{ 'lfo-shape-active': lfoShape === shape }"
          @click="
            lfoShape = shape;
            stopLfo();
            startLfo();
          "
        >
          {{ { sine: "~", triangle: "△", square: "⊓", saw: "/" }[shape] }}
        </button>
        <span class="lfo-sep">|</span>
        <button
          v-for="tgt in [
            { id: 'cf', label: 'CF' },
            { id: 'hue', label: 'HUE' },
            { id: 'sat', label: 'SAT' },
          ]"
          :key="tgt.id"
          type="button"
          class="lfo-shape-btn"
          :class="{ 'lfo-shape-active': lfoTarget === tgt.id }"
          @click="
            lfoTarget = tgt.id;
            stopLfo();
            startLfo();
          "
        >
          {{ tgt.label }}
        </button>
      </div>
      <!-- Master hue spin -->
      <div class="lfo-rate-row">
        <span class="popover-label">SPIN</span>
        <input
          type="range"
          class="popover-slider"
          min="-360"
          max="360"
          step="5"
          :value="masterHueSpin"
          @input="setMasterHueSpin($event.target.value)"
          title="Continuously rotate master output hue (degrees/sec)"
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
          class="deck-freeze-btn"
          :class="{ 'deck-freeze-active': frozenB }"
          title="Freeze / hold current frame"
          @click="toggleFreeze('B')"
        >
          ❄
        </button>
        <button
          type="button"
          class="deck-cam-btn"
          :class="{ 'deck-cam-active': camB }"
          title="Webcam live input for Deck B"
          @click="toggleCam('B')"
        >
          CAM
        </button>
        <button
          type="button"
          class="deck-mirror-btn"
          :class="{ 'deck-mirror-active': mirrorB }"
          title="Flip Deck B horizontally"
          @click="toggleMirror('B')"
        >
          ↔
        </button>
        <button
          type="button"
          class="deck-tile-btn"
          :class="{ 'deck-tile-active': tileModeB === '2x2' }"
          title="2×2 tile / mirror-4 for Deck B (click to cycle)"
          @click="cycleTileMode('B')"
        >
          {{ tileModeB === "mirror4" ? "⊞M" : tileModeB === "2x2" ? "⊞" : "⊡" }}
        </button>
        <button
          type="button"
          class="deck-stutter-btn"
          :class="{ 'deck-stutter-active': stutteringDeck === 'B' }"
          title="Stutter — hold to loop current frame rapidly"
          @mousedown.prevent="startStutter('B')"
          @mouseup="stopStutter"
          @mouseleave="stopStutter"
          @touchstart.prevent="startStutter('B')"
          @touchend.prevent="stopStutter"
        >
          STUT
        </button>
        <button
          type="button"
          class="deck-ramp-btn"
          :class="{ 'deck-ramp-active': rampingDeck === 'B' && rampDir > 0 }"
          title="Speed ramp UP — hold to accelerate"
          @mousedown.prevent="startRamp('B', 1)"
          @mouseup="stopRamp"
          @mouseleave="stopRamp"
          @touchstart.prevent="startRamp('B', 1)"
          @touchend.prevent="stopRamp"
        >
          R+
        </button>
        <button
          type="button"
          class="deck-ramp-btn"
          :class="{ 'deck-ramp-active': rampingDeck === 'B' && rampDir < 0 }"
          title="Speed ramp DOWN — hold to decelerate"
          @mousedown.prevent="startRamp('B', -1)"
          @mouseup="stopRamp"
          @mouseleave="stopRamp"
          @touchstart.prevent="startRamp('B', -1)"
          @touchend.prevent="stopRamp"
        >
          R-
        </button>
        <button
          type="button"
          class="deck-fx-toggle"
          :class="{ 'deck-fx-open': showFxB }"
          title="Toggle color effects"
          @click="showFxB = !showFxB"
        >
          FX
        </button>
        <button
          type="button"
          class="deck-rev-btn"
          :class="{ 'deck-rev-active': reversedB }"
          title="Reverse playback"
          @click="toggleReverse('B')"
        >
          ◀◀
        </button>
        <button
          type="button"
          class="deck-qbeat-btn"
          :class="{ 'deck-qbeat-active': quantizeB }"
          title="Quantize launch to next beat"
          @click="quantizeB = !quantizeB"
        >
          Q
        </button>
        <button
          type="button"
          class="deck-auto-btn"
          :class="{ 'deck-auto-active': autoTriggerB }"
          title="Auto-trigger random clips on beat"
          @click="toggleAutoTrigger('B')"
        >
          AUTO
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
      <div v-if="showFxB" class="deck-fx-row">
        <label class="fx-label">BRI</label>
        <input
          type="range"
          class="fx-slider"
          min="0"
          max="3"
          step="0.05"
          :value="fxB.brightness"
          @input="updateFx('B', 'brightness', $event.target.value)"
        />
        <label class="fx-label">CON</label>
        <input
          type="range"
          class="fx-slider"
          min="0"
          max="3"
          step="0.05"
          :value="fxB.contrast"
          @input="updateFx('B', 'contrast', $event.target.value)"
        />
        <label class="fx-label">HUE</label>
        <input
          type="range"
          class="fx-slider"
          min="-180"
          max="180"
          step="1"
          :value="fxB.hue"
          @input="updateFx('B', 'hue', $event.target.value)"
        />
        <label class="fx-label">SAT</label>
        <input
          type="range"
          class="fx-slider"
          min="0"
          max="3"
          step="0.05"
          :value="fxB.saturation"
          @input="updateFx('B', 'saturation', $event.target.value)"
        />
        <label class="fx-label">OPA</label>
        <input
          type="range"
          class="fx-slider"
          min="0"
          max="1"
          step="0.01"
          :value="opacityB"
          @input="setDeckOpacity('B', $event.target.value)"
        />
        <label class="fx-label">BLR</label>
        <input
          type="range"
          class="fx-slider"
          min="0"
          max="20"
          step="0.5"
          :value="fxB.blur"
          @input="updateFx('B', 'blur', $event.target.value)"
        />
        <label class="fx-label">G</label>
        <input
          type="range"
          class="fx-slider"
          min="0"
          max="1"
          step="0.01"
          :value="fxB.grayscale"
          @input="updateFx('B', 'grayscale', $event.target.value)"
        />
        <label class="fx-label">INV</label>
        <input
          type="range"
          class="fx-slider"
          min="0"
          max="1"
          step="0.01"
          :value="fxB.invert"
          @input="updateFx('B', 'invert', $event.target.value)"
        />
        <label class="fx-label">SEP</label>
        <input
          type="range"
          class="fx-slider"
          min="0"
          max="1"
          step="0.01"
          :value="fxB.sepia"
          @input="updateFx('B', 'sepia', $event.target.value)"
        />
        <label class="fx-label">RGB</label>
        <input
          type="range"
          class="fx-slider fx-slider-chroma"
          min="0"
          max="30"
          step="0.5"
          :value="chromaB"
          @input="setChroma('B', $event.target.value)"
          title="Chromatic aberration — RGB split offset"
        />
        <button class="fx-reset-btn" @click="resetFx('B')">↺</button>
      </div>
      <div v-if="showFxB" class="deck-grade-row">
        <button
          v-for="grade in colorGrades"
          :key="grade.id"
          type="button"
          class="grade-btn"
          :title="grade.label"
          @click="applyGrade('B', grade)"
        >
          {{ grade.label }}
        </button>
      </div>
      <div v-if="showFxB" class="deck-transform-row">
        <label class="fx-label">X</label>
        <input
          type="range"
          class="fx-slider"
          min="-1"
          max="1"
          step="0.01"
          :value="transformB.posX"
          @input="updateTransform('B', 'posX', $event.target.value)"
          @dblclick="resetTransform('B', 'posX')"
        />
        <label class="fx-label">Y</label>
        <input
          type="range"
          class="fx-slider"
          min="-1"
          max="1"
          step="0.01"
          :value="transformB.posY"
          @input="updateTransform('B', 'posY', $event.target.value)"
          @dblclick="resetTransform('B', 'posY')"
        />
        <label class="fx-label">SCL</label>
        <input
          type="range"
          class="fx-slider"
          min="0.1"
          max="3"
          step="0.05"
          :value="transformB.scale"
          @input="updateTransform('B', 'scale', $event.target.value)"
          @dblclick="resetTransform('B', 'scale')"
        />
        <button
          class="fx-reset-btn"
          @click="resetTransformAll('B')"
          title="Reset X/Y/Scale"
        >
          ↺
        </button>
      </div>
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
          @contextmenu.prevent="openSlotMenu('B', slot, $event)"
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

    <!-- Slot context menu -->
    <div
      v-if="slotMenu.visible"
      class="slot-ctx-menu"
      :style="{ top: slotMenu.y + 'px', left: slotMenu.x + 'px' }"
      @mouseleave="slotMenu.visible = false"
    >
      <button class="ctx-item" @click="ctxLoadFile">Load File…</button>
      <button class="ctx-item" @click="ctxLoadUrl">Load URL…</button>
      <button class="ctx-item" @click="ctxOpenLibrary">Browse Library…</button>
      <div class="ctx-divider" />
      <button
        class="ctx-item ctx-item-danger"
        :disabled="!slotMenu.hasSource"
        @click="ctxClear"
      >
        Clear Slot
      </button>
    </div>

    <!-- URL input dialog -->
    <transition name="wizard-fade">
      <div
        v-if="showUrlDialog"
        class="wizard-overlay"
        @click.self="showUrlDialog = false"
      >
        <div class="wizard-panel url-dialog-panel">
          <div class="wizard-title">Load from URL</div>
          <p class="url-dialog-hint">
            Paste a direct <code>.mp4</code>, <code>.webm</code>, or
            <code>.m3u8</code> (HLS) URL.
          </p>
          <input
            ref="urlInput"
            v-model="urlInputValue"
            class="url-input-field"
            type="text"
            placeholder="https://example.com/clip.mp4"
            @keydown.enter="confirmUrlLoad"
            @keydown.esc="showUrlDialog = false"
          />
          <div class="url-dialog-footer">
            <button
              class="wizard-btn-ghost wizard-btn"
              @click="showUrlDialog = false"
            >
              Cancel
            </button>
            <button
              class="wizard-btn"
              :disabled="!urlInputValue.trim()"
              @click="confirmUrlLoad"
            >
              Load
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Footage Library -->
    <transition name="wizard-fade">
      <div
        v-if="showLibrary"
        class="wizard-overlay"
        @click.self="showLibrary = false"
      >
        <div class="wizard-panel library-panel">
          <div class="wizard-title">Footage Library</div>
          <div class="library-tabs">
            <button
              v-for="cat in libraryCategories"
              :key="cat.id"
              class="lib-tab"
              :class="{ 'lib-tab-active': libraryTab === cat.id }"
              @click="libraryTab = cat.id"
            >
              {{ cat.label }}
            </button>
          </div>
          <div class="library-list">
            <div
              v-for="item in currentLibraryItems"
              :key="item.url"
              class="library-item"
            >
              <div class="lib-item-info">
                <div class="lib-item-name">{{ item.name }}</div>
                <div class="lib-item-url">{{ item.url }}</div>
              </div>
              <button class="lib-load-btn" @click="loadLibraryItem(item)">
                Load →
              </button>
            </div>
          </div>
          <div class="library-footer">
            <span
              >Click Load → to put into slot {{ libraryTargetDeck }}
              {{
                libraryTargetSlot ? slotAddress(libraryTargetSlot.id) : ""
              }}</span
            >
            <button
              class="wizard-btn-ghost wizard-btn"
              @click="showLibrary = false"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- First-launch Wizard Overlay -->
    <transition name="wizard-fade">
      <div v-if="showWizard" class="wizard-overlay" @click.self="closeWizard">
        <div class="wizard-panel">
          <div class="wizard-steps">
            <span
              v-for="n in 3"
              :key="n"
              class="wizard-step-dot"
              :class="{ 'wizard-step-dot-active': wizardStep === n - 1 }"
            ></span>
          </div>

          <!-- Step 0: Welcome -->
          <div v-if="wizardStep === 0" class="wizard-step">
            <div class="wizard-title">Welcome to Grackle</div>
            <div class="wizard-body">
              <p>
                You're looking at a live video mixer. Two video decks, a
                crossfader, and FX — all running in real time.
              </p>
              <div class="wizard-diagram">
                <div class="wd-box wd-deck">
                  DECK A<br /><span class="wd-sub">your clips</span>
                </div>
                <div class="wd-box wd-cf">
                  ◄ CF ►<br /><span class="wd-sub">blend</span>
                </div>
                <div class="wd-box wd-deck">
                  DECK B<br /><span class="wd-sub">your clips</span>
                </div>
              </div>
              <p class="wizard-hint">
                Load clips on each side. Move the crossfader to blend between
                them.
              </p>
            </div>
          </div>

          <!-- Step 1: Load clips -->
          <div v-if="wizardStep === 1" class="wizard-step">
            <div class="wizard-title">Load &amp; Play Clips</div>
            <div class="wizard-body">
              <div class="wizard-how-list">
                <div class="wizard-how-item">
                  <div class="wizard-how-icon">DRAG</div>
                  <div>Drop video files directly onto any grid slot</div>
                </div>
                <div class="wizard-how-item">
                  <div class="wizard-how-icon">CLICK</div>
                  <div>
                    Click any empty slot (the <strong>+</strong>) to browse your
                    files
                  </div>
                </div>
                <div class="wizard-how-item">
                  <div class="wizard-how-icon">PLAY</div>
                  <div>Tap a loaded slot to trigger it — tap again to stop</div>
                </div>
                <div class="wizard-how-item">
                  <div class="wizard-how-icon">KEYS</div>
                  <div>
                    Press <kbd>?</kbd> at any time to see all keyboard shortcuts
                  </div>
                </div>
              </div>
              <p class="wizard-hint">
                Each deck has 8 columns × 8 rows = 64 slots per side.
              </p>
            </div>
          </div>

          <!-- Step 2: Templates -->
          <div v-if="wizardStep === 2" class="wizard-step">
            <div class="wizard-title">16 Scene Templates</div>
            <div class="wizard-body">
              <p>
                Loads 16 presets into your <strong>SCENE</strong> buttons. Tap
                to recall, hold to overwrite.
              </p>
              <div class="wizard-templates">
                <div class="wizard-template-row">
                  <span class="wt-num">1</span><span class="wt-name">CLEAN</span
                  ><span class="wt-desc">Neutral crossfade · no effects</span>
                </div>
                <div class="wizard-template-row">
                  <span class="wt-num">2</span><span class="wt-name">NEON</span
                  ><span class="wt-desc">Screen · saturated · beat flash</span>
                </div>
                <div class="wizard-template-row">
                  <span class="wt-num">3</span><span class="wt-name">NOIR</span
                  ><span class="wt-desc">Multiply · grayscale · trail</span>
                </div>
                <div class="wizard-template-row">
                  <span class="wt-num">4</span><span class="wt-name">HYPE</span
                  ><span class="wt-desc">Add · mirror A · flash + zoom</span>
                </div>
                <div class="wizard-template-row">
                  <span class="wt-num">5</span><span class="wt-name">DREAM</span
                  ><span class="wt-desc">Screen · warm · ghost trail</span>
                </div>
                <div class="wizard-template-row">
                  <span class="wt-num">6</span><span class="wt-name">VOID</span
                  ><span class="wt-desc">Darken · crushed · dark trail</span>
                </div>
                <div class="wizard-template-row">
                  <span class="wt-num">7</span><span class="wt-name">LUSH</span
                  ><span class="wt-desc"
                    >Overlay · super-saturated · trail</span
                  >
                </div>
                <div class="wizard-template-row">
                  <span class="wt-num">8</span><span class="wt-name">ACID</span
                  ><span class="wt-desc"
                    >Exclusion · hue-flipped B · flash</span
                  >
                </div>
                <div class="wizard-template-row">
                  <span class="wt-num">9</span
                  ><span class="wt-name">CHROME</span
                  ><span class="wt-desc">Screen · ice-cold · mirror both</span>
                </div>
                <div class="wizard-template-row">
                  <span class="wt-num">10</span
                  ><span class="wt-name">EMBER</span
                  ><span class="wt-desc">Multiply · warm sepia · trail</span>
                </div>
                <div class="wizard-template-row">
                  <span class="wt-num">11</span
                  ><span class="wt-name">GLITCH</span
                  ><span class="wt-desc">Hard-light · inverted B · flash</span>
                </div>
                <div class="wizard-template-row">
                  <span class="wt-num">12</span
                  ><span class="wt-name">SOLAR</span
                  ><span class="wt-desc">Add · warm A + neon B · zoom</span>
                </div>
                <div class="wizard-template-row">
                  <span class="wt-num">13</span
                  ><span class="wt-name">BLOOM</span
                  ><span class="wt-desc">Screen · soft blur · long trail</span>
                </div>
                <div class="wizard-template-row">
                  <span class="wt-num">14</span><span class="wt-name">RAVE</span
                  ><span class="wt-desc"
                    >Add · mirror + tile · all effects</span
                  >
                </div>
                <div class="wizard-template-row">
                  <span class="wt-num">15</span
                  ><span class="wt-name">PRISM</span
                  ><span class="wt-desc"
                    >Difference · hue-split A/B · trail</span
                  >
                </div>
                <div class="wizard-template-row">
                  <span class="wt-num">16</span
                  ><span class="wt-name">GHOST</span
                  ><span class="wt-desc"
                    >Screen · transparent B · long trail</span
                  >
                </div>
              </div>
              <button
                class="wizard-load-btn"
                :class="{ 'wizard-load-btn-done': templatesLoaded }"
                @click="loadDefaultTemplates"
              >
                {{ templatesLoaded ? "✓ Templates Loaded" : "Load Templates" }}
              </button>
            </div>
          </div>

          <div class="wizard-nav">
            <button
              v-if="wizardStep > 0"
              class="wizard-btn wizard-btn-ghost"
              @click="wizardStep--"
            >
              Back
            </button>
            <span v-else></span>
            <button
              v-if="wizardStep < 2"
              class="wizard-btn"
              @click="wizardStep++"
            >
              Next →
            </button>
            <button v-else class="wizard-btn" @click="closeWizard">Done</button>
          </div>

          <div class="wizard-skip" @click="closeWizard">skip</div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import deckMixer from "../application/DeckMixer";
import midiBindingService from "../application/MidiBindingService";
import clipLauncher from "../media-manager/ClipLauncher";
import BeatSync from "../application/BeatSync";

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
      bpmSyncOptions: [
        { label: "Off", value: 0 },
        { label: "1", value: 1 },
        { label: "2", value: 2 },
        { label: "4", value: 4 },
        { label: "8", value: 8 },
      ],
      popover: {
        visible: false,
        deck: null,
        slot: null,
        slotLabel: "",
        loopMode: "loop",
        bpmSyncBeats: 0,
        speed: 1.0,
        loopIn: 0,
        loopOut: 1,
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
      lfoShape: "sine",
      lfoTarget: "cf",
      masterHueSpin: 0,
      lfoPhase: 0,
      lfoInterval: null,
      opacityA: 1.0,
      opacityB: 1.0,
      frozenA: false,
      frozenB: false,
      stutteringDeck: null,
      stutterDivision: 8, // 1/Nth beat
      stutterDivisions: [
        { label: "1/4", value: 4 },
        { label: "1/8", value: 8 },
        { label: "1/16", value: 16 },
      ],
      autoTriggerA: false,
      autoTriggerB: false,
      autoTriggerDivision: 1,
      autoTriggerDivisions: [
        { label: "1", value: 1 },
        { label: "2", value: 2 },
        { label: "4", value: 4 },
        { label: "8", value: 8 },
      ],
      masterSpeedA: 1.0,
      masterSpeedB: 1.0,
      blendMode: "cross",
      beatFlashEnabled: false,
      beatZoomEnabled: false,
      masterBrightness: 1.0,
      blackoutOn: false,
      whiteoutOn: false,
      camA: false,
      camB: false,
      mirrorA: false,
      mirrorB: false,
      tileModeA: null,
      tileModeB: null,
      transformA: { posX: 0, posY: 0, scale: 1 },
      transformB: { posX: 0, posY: 0, scale: 1 },
      autoCrossfading: false,
      autoCfDuration: 2,
      autoCfDurations: [
        { label: "1s", value: 1 },
        { label: "2s", value: 2 },
        { label: "4s", value: 4 },
        { label: "8s", value: 8 },
      ],
      trailEnabled: false,
      trailDecay: 0.85,
      rampingDeck: null,
      rampDir: 0,
      reversedA: false,
      reversedB: false,
      quantizeA: false,
      quantizeB: false,
      chromaA: 0,
      chromaB: 0,
      pixelate: 1,
      glitchEnabled: false,
      glitchIntensity: 0.4,
      strobeEnabled: false,
      strobeHz: 8,
      masterContrast: 1.0,
      masterSaturation: 1.0,
      masterHue: 0,
      isRecording: false,
      recordElapsed: 0,
      outputResolution: "720p",
      outputResolutions: [
        { label: "720p", w: 1280, h: 720 },
        { label: "1080p", w: 1920, h: 1080 },
        { label: "480p", w: 854, h: 480 },
      ],
      scenePresets: Array(16).fill(null),
      showWizard: false,
      wizardStep: 0,
      templatesLoaded: false,
      // context menu
      slotMenu: {
        visible: false,
        x: 0,
        y: 0,
        deck: null,
        slot: null,
        hasSource: false,
      },
      // URL dialog
      showUrlDialog: false,
      urlInputValue: "",
      urlTargetDeck: null,
      urlTargetSlot: null,
      // library
      showLibrary: false,
      libraryTab: "abstract",
      libraryTargetDeck: null,
      libraryTargetSlot: null,
      libraryCategories: [
        { id: "abstract", label: "Abstract" },
        { id: "nature", label: "Nature" },
        { id: "space", label: "Space" },
        { id: "samples", label: "Sample Clips" },
        { id: "livecams", label: "Live Cams (HLS)" },
      ],
      libraryItems: {
        abstract: [
          {
            name: "Lava Lamp – Purple",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
          },
          {
            name: "Fluid Ink – Dark",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
          },
          {
            name: "Big Buck Bunny (test loop)",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          },
          {
            name: "Elephant Dream (CC)",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
          },
        ],
        nature: [
          {
            name: "Ocean Waves – Slow",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
          },
          {
            name: "Forest – Aerial",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4",
          },
          {
            name: "Waterfall – Timelapse",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4",
          },
        ],
        space: [
          {
            name: "Earth from ISS (NASA, CC)",
            url: "https://images-assets.nasa.gov/video/NHQ_2019_0311_Go Forward to the Moon/NHQ_2019_0311_Go Forward to the Moon~orig.mp4",
          },
          {
            name: "Subaru – Wide Field Stars",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
          },
        ],
        samples: [
          {
            name: "Tears of Steel (CC, Blender)",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
          },
          {
            name: "Sintel (CC, Blender)",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
          },
          {
            name: "For Bigger Blazes",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          },
          {
            name: "For Bigger Fun",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
          },
          {
            name: "For Bigger Joyrides",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
          },
          {
            name: "For Bigger Meltdowns",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
          },
        ],
        livecams: [
          {
            name: "NASA TV Public (HLS)",
            url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-Public/master.m3u8",
          },
          {
            name: "Relaxing – White Noise Stream (HLS)",
            url: "https://streams.radioboss.fm:8443/relaxinghls/stream.m3u8",
          },
        ],
      },
      showFxA: false,
      showFxB: false,
      fxA: {
        brightness: 1.0,
        contrast: 1.0,
        saturation: 1.0,
        hue: 0,
        blur: 0,
        grayscale: 0,
        invert: 0,
        sepia: 0,
      },
      fxB: {
        brightness: 1.0,
        contrast: 1.0,
        saturation: 1.0,
        hue: 0,
        blur: 0,
        grayscale: 0,
        invert: 0,
        sepia: 0,
      },
      blendModes: [
        { label: "×fade", value: "cross" },
        { label: "add", value: "add" },
        { label: "scr", value: "screen" },
        { label: "mul", value: "multiply" },
        { label: "ovr", value: "overlay" },
        { label: "diff", value: "difference" },
        { label: "excl", value: "exclusion" },
        { label: "hrd", value: "hard-light" },
        { label: "sft", value: "soft-light" },
        { label: "drk", value: "darken" },
        { label: "lgt", value: "lighten" },
      ],
      speedPresets: [
        { label: "¼", value: 0.25 },
        { label: "½", value: 0.5 },
        { label: "1×", value: 1.0 },
        { label: "2×", value: 2.0 },
        { label: "4×", value: 4.0 },
      ],
      colorGrades: [
        {
          id: "neon",
          label: "NEON",
          fx: {
            brightness: 1.1,
            contrast: 1.3,
            saturation: 2.5,
            hue: 0,
            blur: 0,
            grayscale: 0,
            invert: 0,
            sepia: 0,
          },
        },
        {
          id: "noir",
          label: "NOIR",
          fx: {
            brightness: 0.9,
            contrast: 1.5,
            saturation: 0.1,
            hue: 0,
            blur: 0,
            grayscale: 0.8,
            invert: 0,
            sepia: 0.15,
          },
        },
        {
          id: "warm",
          label: "WARM",
          fx: {
            brightness: 1.05,
            contrast: 1.1,
            saturation: 1.4,
            hue: 20,
            blur: 0,
            grayscale: 0,
            invert: 0,
            sepia: 0,
          },
        },
        {
          id: "cold",
          label: "COLD",
          fx: {
            brightness: 0.95,
            contrast: 1.1,
            saturation: 0.85,
            hue: -20,
            blur: 0,
            grayscale: 0,
            invert: 0,
            sepia: 0,
          },
        },
        {
          id: "vibe",
          label: "VIBE",
          fx: {
            brightness: 1.0,
            contrast: 1.2,
            saturation: 3.0,
            hue: 90,
            blur: 0,
            grayscale: 0,
            invert: 0.05,
            sepia: 0,
          },
        },
      ],
    };
  },

  mounted() {
    // Load persisted scene presets
    try {
      const raw = window.localStorage.getItem("grackle-scene-presets-v2");
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved)) {
          for (let i = 0; i < 16 && i < saved.length; i++) {
            this.scenePresets[i] = saved[i];
          }
        }
      }
    } catch (_e) {
      // ignore corrupt storage
    }

    // Show wizard on first launch
    if (!window.localStorage.getItem("grackle-wizard-done")) {
      this.$nextTick(() => {
        this.showWizard = true;
      });
    }

    this._autoTriggerBeatCount = 0;
    this._presetLongPressTimer = null;
    this._presetLongPressIndex = null;
    this._autoCfRaf = null;
    this._recordInterval = null;
    this._rampInterval = null;
    this._quantizePendingA = null;
    this._quantizePendingB = null;
    this._beatUnsubscribe = BeatSync.on("beat", () => this.onAutoTriggerBeat());
    this.lastKickState = Boolean(this.$modV?.store?.state?.beats?.kick);
    this.beatPollInterval = setInterval(this.pollBeatState, 1000 / 60);
    this.progressInterval = setInterval(() => {
      this.playbackProgressA = deckMixer.playerA.progress;
      this.playbackProgressB = deckMixer.playerB.progress;
      this.playbackProgress = deckMixer.progress;
      // Keep frozen indicators in sync with actual player state
      this.frozenA = deckMixer.playerA.isFrozen;
      this.frozenB = deckMixer.playerB.isFrozen;
    }, 100);
    this.previewInterval = setInterval(this.drawOutputPreview, 1000 / 30);
    this.stopListeningForBeatSyncMode = clipLauncher.on(
      "beat-sync-mode-changed",
      (mode) => {
        this.beatSyncMode = mode;
      }
    );
    document.addEventListener("click", this.closePopover);
    document.addEventListener("click", this._closeSlotMenu);
    document.addEventListener("keydown", this.onKeyDown);
  },

  beforeDestroy() {
    if (this._beatUnsubscribe) {
      this._beatUnsubscribe();
      this._beatUnsubscribe = null;
    }

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
    document.removeEventListener("click", this._closeSlotMenu);
    document.removeEventListener("keydown", this.onKeyDown);
    this.stopStutter();
    this.cancelLongPress();
    this.cancelPresetLongPress();
    this.cancelMidiLearnMode();
    this.stopLfo();

    if (this._autoCfRaf) {
      cancelAnimationFrame(this._autoCfRaf);
      this._autoCfRaf = null;
    }

    if (this._recordInterval) {
      clearInterval(this._recordInterval);
      this._recordInterval = null;
    }

    this.stopRamp();
  },

  computed: {
    currentLibraryItems() {
      return this.libraryItems[this.libraryTab] || [];
    },

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

    popoverBpmPreview() {
      const { bpmSyncBeats, slot } = this.popover;

      if (!bpmSyncBeats || !slot || !slot.source || !slot.source.duration) {
        return "";
      }

      const bpm = this.$modV?.store?.state?.beats?.bpm ?? 120;
      const targetDuration = (bpmSyncBeats * 60) / bpm;
      const rate = slot.source.duration / targetDuration;
      return `${rate.toFixed(2)}x @ ${bpm}BPM`;
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

      // Beat-quantized launch: queue for next beat instead of firing now
      const quantized = deck === "A" ? this.quantizeA : this.quantizeB;

      if (quantized) {
        if (deck === "A") {
          this._quantizePendingA = { row, col };
        } else {
          this._quantizePendingB = { row, col };
        }
        return;
      }

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

    _closeSlotMenu() {
      this.slotMenu.visible = false;
    },

    openSlotMenu(deck, slot, event) {
      const margin = 8;
      const menuW = 180;
      const x = Math.min(event.clientX, window.innerWidth - menuW - margin);
      this.slotMenu = {
        visible: true,
        x,
        y: event.clientY + margin,
        deck,
        slot,
        hasSource: Boolean(slot.source),
      };
    },

    ctxLoadFile() {
      const { deck, slot } = this.slotMenu;
      this.slotMenu.visible = false;
      this.openFilePicker(deck, slot);
    },

    ctxLoadUrl() {
      const { deck, slot } = this.slotMenu;
      this.slotMenu.visible = false;
      this.urlTargetDeck = deck;
      this.urlTargetSlot = slot;
      this.urlInputValue = "";
      this.showUrlDialog = true;
      this.$nextTick(() => this.$refs.urlInput && this.$refs.urlInput.focus());
    },

    ctxOpenLibrary() {
      const { deck, slot } = this.slotMenu;
      this.slotMenu.visible = false;
      this.libraryTargetDeck = deck;
      this.libraryTargetSlot = slot;
      this.showLibrary = true;
    },

    ctxClear() {
      const { deck, slot } = this.slotMenu;
      this.slotMenu.visible = false;
      this.clearSlot(deck, slot);
    },

    confirmUrlLoad() {
      const raw = this.urlInputValue.trim();
      if (!raw) {
        return;
      }
      const { row, col } = parseSlotId(this.urlTargetSlot.id);
      const name = raw.split("/").pop().split("?")[0] || "stream";
      clipLauncher.loadClip(this.urlTargetDeck, row, col, { url: raw, name });
      this.showUrlDialog = false;
    },

    loadLibraryItem(item) {
      const { row, col } = parseSlotId(this.libraryTargetSlot.id);
      clipLauncher.loadClip(this.libraryTargetDeck, row, col, {
        url: item.url,
        name: item.name,
      });
      this.showLibrary = false;
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
        const p = this.lfoPhase;
        let value;

        if (this.lfoShape === "triangle") {
          // Triangle: 0→1→0→1...
          value = 1 - Math.abs(((p / Math.PI) % 2) - 1);
        } else if (this.lfoShape === "square") {
          value = Math.sin(p) >= 0 ? 1 : 0;
        } else if (this.lfoShape === "saw") {
          value = (p % (2 * Math.PI)) / (2 * Math.PI);
        } else {
          // sine (default)
          value = (Math.sin(p) + 1) / 2;
        }

        if (this.lfoTarget === "hue") {
          const hue = value * 360 - 180;
          this.masterHue = hue;
          deckMixer.setMasterFx({ hue });
        } else if (this.lfoTarget === "sat") {
          const sat = value * 3;
          this.masterSaturation = sat;
          deckMixer.setMasterFx({ saturation: sat });
        } else {
          // crossfader (default)
          clipLauncher.setCrossfader(value);
        }
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

    toggleFreeze(deck) {
      const player = deck === "A" ? deckMixer.playerA : deckMixer.playerB;
      player.toggleFreeze();

      if (deck === "A") {
        this.frozenA = player.isFrozen;
      } else {
        this.frozenB = player.isFrozen;
      }
    },

    stopDeck(deck) {
      const player = deck === "A" ? deckMixer.playerA : deckMixer.playerB;
      player.stop();

      if (deck === "A") {
        this.camA = false;
      } else {
        this.camB = false;
      }

      // Passing row/col of -1 sets all slots in this deck to active=false
      this.$store.commit("clip-launcher/TRIGGER_CLIP", {
        deck,
        row: -1,
        col: -1,
      });
    },

    setBlackout(active) {
      this.blackoutOn = active;
      deckMixer.setBlackout(active);
    },

    setWhiteout(active) {
      this.whiteoutOn = active;
      deckMixer.setWhiteout(active);
    },

    toggleBeatFlash() {
      this.beatFlashEnabled = !this.beatFlashEnabled;
      deckMixer.beatFlashEnabled = this.beatFlashEnabled;
    },

    toggleBeatZoom() {
      this.beatZoomEnabled = !this.beatZoomEnabled;
      deckMixer.beatZoomEnabled = this.beatZoomEnabled;
    },

    setMasterBrightness(rawValue) {
      const value = Math.max(0, Math.min(2, parseFloat(rawValue) || 1));
      this.masterBrightness = value;
      deckMixer.setMasterBrightness(value);
    },

    resetMasterBrightness() {
      this.setMasterBrightness(1.0);
    },

    panic() {
      // Stop both decks
      this.stopDeck("A");
      this.stopDeck("B");

      // Reset all FX to defaults
      this.resetFx("A");
      this.resetFx("B");

      // Reset opacity
      this.opacityA = 1.0;
      this.opacityB = 1.0;
      deckMixer.setOpacity("A", 1.0);
      deckMixer.setOpacity("B", 1.0);

      // Reset master brightness
      this.setMasterBrightness(1.0);

      // Clear blackout / whiteout
      this.setBlackout(false);
      this.setWhiteout(false);

      // Stop stutter + ramp
      this.stopStutter();
      this.stopRamp();

      // Disable auto-trigger
      this.autoTriggerA = false;
      this.autoTriggerB = false;

      // Disable beat effects
      this.beatFlashEnabled = false;
      this.beatZoomEnabled = false;
      deckMixer.beatFlashEnabled = false;
      deckMixer.beatZoomEnabled = false;

      // Reset crossfader to center
      clipLauncher.setCrossfader(0.5);

      // Reset blend mode
      this.blendMode = "cross";
      deckMixer.setBlendMode("cross");

      // Reset mirror
      this.mirrorA = false;
      this.mirrorB = false;
      deckMixer.setMirror("A", false);
      deckMixer.setMirror("B", false);

      // Reset tile modes
      this.tileModeA = null;
      this.tileModeB = null;
      deckMixer.setTileMode("A", null);
      deckMixer.setTileMode("B", null);

      // Reset deck transforms
      this.resetTransformAll("A");
      this.resetTransformAll("B");

      // Reset trail
      this.trailEnabled = false;
      deckMixer.setTrail(false);

      // Reset reverse
      this.reversedA = false;
      this.reversedB = false;
      deckMixer.setReversed("A", false);
      deckMixer.setReversed("B", false);

      // Clear quantize pending
      this.quantizeA = false;
      this.quantizeB = false;
      this._quantizePendingA = null;
      this._quantizePendingB = null;

      // Reset chroma
      this.chromaA = 0;
      this.chromaB = 0;
      deckMixer.setChroma("A", 0);
      deckMixer.setChroma("B", 0);

      // Reset pixelate + glitch
      this.pixelate = 1;
      deckMixer.setPixelate(1);
      this.glitchEnabled = false;
      deckMixer.setGlitch(false);

      // Reset strobe
      this.strobeEnabled = false;
      deckMixer.setStrobe(false);

      // Reset master output FX + hue spin
      this.masterContrast = 1.0;
      this.masterSaturation = 1.0;
      this.masterHue = 0;
      this.masterHueSpin = 0;
      deckMixer.setMasterFx({ contrast: 1.0, saturation: 1.0, hue: 0 });
      deckMixer._masterHueSpin = 0;

      // Stop LFO
      this.stopLfo();
    },

    setBlendMode(mode) {
      this.blendMode = mode;
      deckMixer.setBlendMode(mode);
    },

    updateFx(deck, param, rawValue) {
      const value = parseFloat(rawValue);
      const fx = deck === "A" ? this.fxA : this.fxB;

      fx[param] = value;
      deckMixer.setFx(deck, { [param]: value });
    },

    resetFx(deck) {
      const defaults = {
        brightness: 1.0,
        contrast: 1.0,
        saturation: 1.0,
        hue: 0,
        blur: 0,
        grayscale: 0,
        invert: 0,
        sepia: 0,
      };

      if (deck === "A") {
        this.fxA = { ...defaults };
      } else {
        this.fxB = { ...defaults };
      }

      deckMixer.setFx(deck, defaults);
    },

    setDeckOpacity(deck, rawValue) {
      const value = Math.max(0, Math.min(1, parseFloat(rawValue) || 1));

      if (deck === "A") {
        this.opacityA = value;
      } else {
        this.opacityB = value;
      }

      deckMixer.setOpacity(deck, value);
    },

    soloDeck(deck) {
      const target = deck === "A" ? 0 : 1;
      const current = this.crossfader;

      // Toggle: if already at this extreme, return to center
      const next = Math.abs(current - target) < 0.01 ? 0.5 : target;

      clipLauncher.setCrossfader(next);
    },

    setMasterSpeed(deck, speed) {
      if (deck === "A") {
        this.masterSpeedA = speed;
      } else {
        this.masterSpeedB = speed;
      }

      deckMixer.setMasterSpeed(deck, speed);
    },

    startRamp(deck, dir) {
      this.stopRamp();
      this.rampingDeck = deck;
      this.rampDir = dir;
      // Multiply speed by 1.015 or 0.985 every 50ms (~12× faster/slower per second)
      this._rampInterval = setInterval(() => {
        const current = deck === "A" ? this.masterSpeedA : this.masterSpeedB;
        const next =
          dir > 0
            ? Math.min(32, current * 1.015)
            : Math.max(0.05, current * 0.985);
        this.setMasterSpeed(deck, next);
      }, 50);
    },

    stopRamp() {
      if (this._rampInterval) {
        clearInterval(this._rampInterval);
        this._rampInterval = null;
      }

      this.rampingDeck = null;
      this.rampDir = 0;
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

    triggerCol(col) {
      // Fire clip at column `col` from the first row that has something loaded
      // in that column, for each deck independently
      const decks = ["A", "B"];

      for (let di = 0, dlen = decks.length; di < dlen; di++) {
        const deck = decks[di];
        const deckRows = this.decks[deck];

        if (!deckRows) {
          continue;
        }

        for (let r = 0; r < deckRows.length; r++) {
          const slot = deckRows[r]?.[col];

          if (slot && slot.source && slot.source.url) {
            clipLauncher.triggerClip(deck, r, col);
            break;
          }
        }
      }
    },

    startStutter(deck) {
      this.stopStutter();

      const player = deck === "A" ? deckMixer.playerA : deckMixer.playerB;

      if (!player.isPlaying || !player._video) {
        return;
      }

      const bpm = this.$modV?.store?.state?.beats?.bpm ?? 120;
      const periodMs = (60 / bpm / this.stutterDivision) * 1000;
      const startTime = player._video.currentTime;

      this.stutteringDeck = deck;
      this._stutterInterval = setInterval(() => {
        if (player._video) {
          player._video.currentTime = startTime;
        }
      }, periodMs);
    },

    stopStutter() {
      if (this._stutterInterval) {
        clearInterval(this._stutterInterval);
        this._stutterInterval = null;
      }

      this.stutteringDeck = null;
    },

    toggleAutoTrigger(deck) {
      if (deck === "A") {
        this.autoTriggerA = !this.autoTriggerA;
      } else {
        this.autoTriggerB = !this.autoTriggerB;
      }
    },

    onAutoTriggerBeat() {
      // Fire any beat-quantized pending clips first
      if (this._quantizePendingA) {
        const p = this._quantizePendingA;
        this._quantizePendingA = null;
        clipLauncher.triggerClip("A", p.row, p.col);
      }

      if (this._quantizePendingB) {
        const p = this._quantizePendingB;
        this._quantizePendingB = null;
        clipLauncher.triggerClip("B", p.row, p.col);
      }

      this._autoTriggerBeatCount = (this._autoTriggerBeatCount || 0) + 1;

      if (this._autoTriggerBeatCount % this.autoTriggerDivision !== 0) {
        return;
      }

      const decks = ["A", "B"];

      for (let i = 0; i < decks.length; i++) {
        const deck = decks[i];
        const enabled = deck === "A" ? this.autoTriggerA : this.autoTriggerB;

        if (!enabled) {
          continue;
        }

        const deckSlots = this.decks[deck];
        const loaded = [];

        for (let row = 0; row < deckSlots.length; row++) {
          for (let col = 0; col < deckSlots[row].length; col++) {
            const slot = deckSlots[row][col];

            if (slot.source && slot.source.url) {
              loaded.push({ row, col });
            }
          }
        }

        if (loaded.length === 0) {
          continue;
        }

        const pick = loaded[Math.floor(Math.random() * loaded.length)];
        clipLauncher.triggerClip(deck, pick.row, pick.col);
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
        bpmSyncBeats: slot.bpmSyncBeats || 0,
        loopIn: slot.loopIn || 0,
        loopOut: slot.loopOut !== undefined ? slot.loopOut : 1,
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

      const { deck, slot, loopMode, speed, bpmSyncBeats, loopIn, loopOut } =
        this.popover;
      const { row, col } = parseSlotId(slot.id);

      clipLauncher.updateSlotSettings(deck, row, col, {
        loopMode,
        speed,
        bpmSyncBeats,
        loopIn,
        loopOut,
      });
      this.closePopover();
    },

    copySlotToOtherDeck() {
      if (!this.popover.slot || !this.popover.hasClip) {
        return;
      }

      const { deck, slot } = this.popover;
      const { row, col } = parseSlotId(slot.id);
      const targetDeck = deck === "A" ? "B" : "A";
      const source = slot.source;

      if (!source) {
        return;
      }

      clipLauncher.loadClip(targetDeck, row, col, {
        name: source.name,
        path: source.path,
        url: source.url,
        duration: source.duration || 0,
      });

      clipLauncher.updateSlotSettings(targetDeck, row, col, {
        loopMode: slot.loopMode || "loop",
        speed: slot.speed || 1.0,
        bpmSyncBeats: slot.bpmSyncBeats || 0,
        loopIn: slot.loopIn || 0,
        loopOut: slot.loopOut !== undefined ? slot.loopOut : 1,
      });

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

    _captureScene() {
      return {
        fxA: { ...this.fxA },
        fxB: { ...this.fxB },
        opacityA: this.opacityA,
        opacityB: this.opacityB,
        crossfader: this.crossfader,
        blendMode: this.blendMode,
        masterBrightness: this.masterBrightness,
        beatFlashEnabled: this.beatFlashEnabled,
        beatZoomEnabled: this.beatZoomEnabled,
        trailEnabled: this.trailEnabled,
        trailDecay: this.trailDecay,
        mirrorA: this.mirrorA,
        mirrorB: this.mirrorB,
        tileModeA: this.tileModeA,
        tileModeB: this.tileModeB,
        transformA: { ...this.transformA },
        transformB: { ...this.transformB },
      };
    },

    _applyScene(scene) {
      if (!scene) {
        return;
      }

      if (scene.fxA) {
        this.fxA = { ...scene.fxA };
        deckMixer.setFx("A", scene.fxA);
      }

      if (scene.fxB) {
        this.fxB = { ...scene.fxB };
        deckMixer.setFx("B", scene.fxB);
      }

      if (scene.opacityA !== undefined) {
        this.opacityA = scene.opacityA;
        deckMixer.setOpacity("A", scene.opacityA);
      }

      if (scene.opacityB !== undefined) {
        this.opacityB = scene.opacityB;
        deckMixer.setOpacity("B", scene.opacityB);
      }

      if (scene.crossfader !== undefined) {
        this.$store.commit("clip-launcher/SET_CROSSFADER", scene.crossfader);
      }

      if (scene.blendMode) {
        this.blendMode = scene.blendMode;
        deckMixer.setBlendMode(scene.blendMode);
      }

      if (scene.masterBrightness !== undefined) {
        this.setMasterBrightness(scene.masterBrightness);
      }

      if (scene.beatFlashEnabled !== undefined) {
        this.beatFlashEnabled = scene.beatFlashEnabled;
        deckMixer.beatFlashEnabled = scene.beatFlashEnabled;
      }

      if (scene.beatZoomEnabled !== undefined) {
        this.beatZoomEnabled = scene.beatZoomEnabled;
        deckMixer.beatZoomEnabled = scene.beatZoomEnabled;
      }

      if (scene.trailEnabled !== undefined) {
        this.trailEnabled = scene.trailEnabled;
        this.trailDecay = scene.trailDecay || 0.85;
        deckMixer.setTrail(scene.trailEnabled, scene.trailDecay);
      }

      if (scene.mirrorA !== undefined) {
        this.mirrorA = scene.mirrorA;
        deckMixer.setMirror("A", scene.mirrorA);
      }

      if (scene.mirrorB !== undefined) {
        this.mirrorB = scene.mirrorB;
        deckMixer.setMirror("B", scene.mirrorB);
      }

      if (scene.tileModeA !== undefined) {
        this.tileModeA = scene.tileModeA;
        deckMixer.setTileMode("A", scene.tileModeA);
      }

      if (scene.tileModeB !== undefined) {
        this.tileModeB = scene.tileModeB;
        deckMixer.setTileMode("B", scene.tileModeB);
      }

      if (scene.transformA) {
        this.transformA = { ...scene.transformA };
        deckMixer.setDeckTransform("A", scene.transformA);
      }

      if (scene.transformB) {
        this.transformB = { ...scene.transformB };
        deckMixer.setDeckTransform("B", scene.transformB);
      }
    },

    _persistPresets() {
      try {
        window.localStorage.setItem(
          "grackle-scene-presets-v2",
          JSON.stringify(this.scenePresets)
        );
      } catch (_e) {
        // storage quota
      }
    },

    loadDefaultTemplates() {
      // Helper: build a compact scene object
      const s = (
        blendMode,
        fxA,
        fxB,
        {
          cf = 0.5,
          mb = 1.0,
          flash = false,
          zoom = false,
          trail = false,
          decay = 0.85,
          mirA = false,
          mirB = false,
          tileA = null,
          tileB = null,
          opA = 1.0,
          opB = 1.0,
        } = {}
      ) => ({
        blendMode,
        fxA,
        fxB,
        crossfader: cf,
        masterBrightness: mb,
        beatFlashEnabled: flash,
        beatZoomEnabled: zoom,
        trailEnabled: trail,
        trailDecay: decay,
        mirrorA: mirA,
        mirrorB: mirB,
        tileModeA: tileA,
        tileModeB: tileB,
        opacityA: opA,
        opacityB: opB,
        transformA: { posX: 0, posY: 0, scale: 1 },
        transformB: { posX: 0, posY: 0, scale: 1 },
      });
      // fx shorthand: [brightness, contrast, saturation, hue, blur, grayscale, invert, sepia]
      const fx = ([br, co, sa, hu, bl, gr, inv, sep]) => ({
        brightness: br,
        contrast: co,
        saturation: sa,
        hue: hu,
        blur: bl,
        grayscale: gr,
        invert: inv,
        sepia: sep,
      });
      const FLAT = fx([1, 1, 1, 0, 0, 0, 0, 0]);
      const templates = [
        // 1 CLEAN — neutral starting point
        s("cross", FLAT, FLAT),
        // 2 NEON — screen, saturated, beat flash
        s(
          "screen",
          fx([1.1, 1.3, 2.5, 0, 0, 0, 0, 0]),
          fx([1.0, 1.2, 3.0, 90, 0, 0, 0.05, 0]),
          { flash: true }
        ),
        // 3 NOIR — multiply, grayscale, motion trail
        s(
          "multiply",
          fx([0.9, 1.5, 0.1, 0, 0, 0.8, 0, 0.15]),
          fx([0.9, 1.5, 0.1, 0, 0, 0.8, 0, 0.15]),
          { trail: true }
        ),
        // 4 HYPE — add, mirror A, beat flash + zoom
        s(
          "add",
          fx([1.1, 1.3, 2.5, 0, 0, 0, 0, 0]),
          fx([0.95, 1.1, 0.85, -20, 0, 0, 0, 0]),
          { flash: true, zoom: true, mirA: true }
        ),
        // 5 DREAM — screen, warm soft, slow ghost trail
        s(
          "screen",
          fx([1.05, 1.05, 1.4, 20, 1, 0, 0, 0.08]),
          fx([1.0, 1.0, 1.2, 10, 0, 0, 0, 0.04]),
          { trail: true, decay: 0.92, opB: 0.8 }
        ),
        // 6 VOID — darken, crushed blacks, very low brightness
        s(
          "darken",
          fx([0.7, 1.8, 0.4, 0, 0, 0, 0, 0]),
          fx([0.7, 1.8, 0.4, 0, 0, 0, 0, 0]),
          { mb: 0.75, trail: true, decay: 0.9 }
        ),
        // 7 LUSH — overlay, super-saturated, trail
        s(
          "overlay",
          fx([1.0, 1.2, 3.0, 90, 0, 0, 0.05, 0]),
          fx([1.0, 1.1, 2.5, 0, 0, 0, 0, 0]),
          { trail: true, decay: 0.8 }
        ),
        // 8 ACID — exclusion, hue-flipped B, high saturation
        s(
          "exclusion",
          fx([1.0, 1.2, 2.8, 0, 0, 0, 0, 0]),
          fx([1.0, 1.2, 2.8, 180, 0, 0, 0.1, 0]),
          { flash: true, zoom: true }
        ),
        // 9 CHROME — screen, ice-cold both, mirror both
        s(
          "screen",
          fx([0.95, 1.2, 0.7, -30, 0, 0, 0, 0]),
          fx([0.95, 1.2, 0.7, -30, 0, 0, 0, 0]),
          { mirA: true, mirB: true }
        ),
        // 10 EMBER — multiply, warm sepia A, trail
        s(
          "multiply",
          fx([1.05, 1.1, 1.5, 25, 0, 0, 0, 0.25]),
          fx([1.0, 1.0, 1.0, 0, 0, 0, 0, 0]),
          { trail: true, decay: 0.88 }
        ),
        // 11 GLITCH — hard-light, invert B, high contrast
        s(
          "hard-light",
          fx([1.1, 1.6, 1.8, 0, 0, 0, 0, 0]),
          fx([0.9, 1.4, 1.2, 0, 0, 0, 0.15, 0]),
          { flash: true }
        ),
        // 12 SOLAR — add, warm A + neon B, beat zoom
        s(
          "add",
          fx([1.05, 1.1, 1.4, 20, 0, 0, 0, 0]),
          fx([1.1, 1.3, 2.5, 0, 0, 0, 0, 0]),
          { zoom: true }
        ),
        // 13 BLOOM — screen, soft blur, long trail
        s(
          "screen",
          fx([1.1, 0.9, 1.3, 0, 2, 0, 0, 0]),
          fx([1.1, 0.9, 1.3, 0, 2, 0, 0, 0]),
          { trail: true, decay: 0.94 }
        ),
        // 14 RAVE — add, mirror both, tiled A, all effects
        s(
          "add",
          fx([1.2, 1.4, 3.0, 0, 0, 0, 0, 0]),
          fx([1.0, 1.2, 3.0, 120, 0, 0, 0, 0]),
          {
            flash: true,
            zoom: true,
            mirA: true,
            mirB: true,
            tileA: "2x2",
          }
        ),
        // 15 PRISM — difference, hue-split A/B, saturation cranked
        s(
          "difference",
          fx([1.0, 1.3, 2.0, 60, 0, 0, 0, 0]),
          fx([1.0, 1.3, 2.0, -60, 0, 0, 0, 0]),
          { flash: true, trail: true, decay: 0.82 }
        ),
        // 16 GHOST — screen, transparent B, very long trail
        s("screen", FLAT, fx([1.2, 0.9, 0.8, 0, 1, 0, 0, 0]), {
          trail: true,
          decay: 0.96,
          opB: 0.5,
          mb: 0.95,
        }),
      ];
      for (let i = 0; i < templates.length; i++) {
        this.$set(this.scenePresets, i, templates[i]);
      }
      this._persistPresets();
      this.templatesLoaded = true;
    },

    closeWizard() {
      this.showWizard = false;
      try {
        window.localStorage.setItem("grackle-wizard-done", "1");
      } catch (_e) {
        /* quota */
      }
    },

    startPresetLongPress(index) {
      this.cancelPresetLongPress();
      this._presetLongPressIndex = index;
      this._presetLongPressTimer = setTimeout(() => {
        this._presetLongPressTimer = null;
        const scene = this._captureScene();
        this.$set(this.scenePresets, index, scene);
        this._persistPresets();
      }, 700);
    },

    endPresetPress(index) {
      if (this._presetLongPressTimer) {
        // Short tap — recall
        clearTimeout(this._presetLongPressTimer);
        this._presetLongPressTimer = null;
        this._applyScene(this.scenePresets[index]);
      }

      this._presetLongPressIndex = null;
    },

    cancelPresetLongPress() {
      if (this._presetLongPressTimer) {
        clearTimeout(this._presetLongPressTimer);
        this._presetLongPressTimer = null;
      }

      this._presetLongPressIndex = null;
    },

    triggerAutoCrossfade() {
      if (this.autoCrossfading) {
        // Cancel in-flight sweep
        if (this._autoCfRaf) {
          cancelAnimationFrame(this._autoCfRaf);
          this._autoCfRaf = null;
        }

        this.autoCrossfading = false;
        return;
      }

      const startCf = this.crossfader;
      const targetCf = startCf <= 0.5 ? 1 : 0;
      const durationMs = this.autoCfDuration * 1000;
      const startTime = performance.now();

      this.autoCrossfading = true;

      const step = (now) => {
        if (!this.autoCrossfading) {
          return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        // Smooth ease-in-out
        const eased =
          progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const cf = startCf + (targetCf - startCf) * eased;
        clipLauncher.setCrossfader(cf);

        if (progress < 1) {
          this._autoCfRaf = requestAnimationFrame(step);
        } else {
          this.autoCrossfading = false;
          this._autoCfRaf = null;
        }
      };

      this._autoCfRaf = requestAnimationFrame(step);
    },

    updateTransform(deck, param, rawValue) {
      const val = parseFloat(rawValue);
      const t = deck === "A" ? this.transformA : this.transformB;
      t[param] = val;
      deckMixer.setDeckTransform(deck, { [param]: val });
    },

    resetTransform(deck, param) {
      const defaults = { posX: 0, posY: 0, scale: 1 };
      const t = deck === "A" ? this.transformA : this.transformB;
      t[param] = defaults[param];
      deckMixer.setDeckTransform(deck, { [param]: defaults[param] });
    },

    resetTransformAll(deck) {
      if (deck === "A") {
        this.transformA = { posX: 0, posY: 0, scale: 1 };
      } else {
        this.transformB = { posX: 0, posY: 0, scale: 1 };
      }

      deckMixer.setDeckTransform(deck, { posX: 0, posY: 0, scale: 1 });
    },

    seekFromPreviewClick(event) {
      const canvas = this.$refs.previewCanvas;

      if (!canvas) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const t = (event.clientX - rect.left) / rect.width;
      const cf = this.crossfader;
      const player = cf > 0.5 ? deckMixer.playerB : deckMixer.playerA;
      player.seek(Math.max(0, Math.min(1, t)));
    },

    cycleTileMode(deck) {
      const current = deck === "A" ? this.tileModeA : this.tileModeB;
      const next =
        current === null ? "2x2" : current === "2x2" ? "mirror4" : null;

      if (deck === "A") {
        this.tileModeA = next;
      } else {
        this.tileModeB = next;
      }

      deckMixer.setTileMode(deck, next);
    },

    toggleMirror(deck) {
      if (deck === "A") {
        this.mirrorA = !this.mirrorA;
        deckMixer.setMirror("A", this.mirrorA);
      } else {
        this.mirrorB = !this.mirrorB;
        deckMixer.setMirror("B", this.mirrorB);
      }
    },

    toggleTrail() {
      this.trailEnabled = !this.trailEnabled;
      deckMixer.setTrail(this.trailEnabled, this.trailDecay);
    },

    setTrailDecay(value) {
      this.trailDecay = parseFloat(value);
      deckMixer.setTrail(this.trailEnabled, this.trailDecay);
    },

    setChroma(deck, value) {
      const v = parseFloat(value);

      if (deck === "A") {
        this.chromaA = v;
      } else {
        this.chromaB = v;
      }

      deckMixer.setChroma(deck, v);
    },

    toggleReverse(deck) {
      if (deck === "A") {
        this.reversedA = !this.reversedA;
        deckMixer.setReversed("A", this.reversedA);
      } else {
        this.reversedB = !this.reversedB;
        deckMixer.setReversed("B", this.reversedB);
      }
    },

    applyGrade(deck, grade) {
      const fxKey = deck === "A" ? "fxA" : "fxB";
      const fields = [
        "brightness",
        "contrast",
        "saturation",
        "hue",
        "blur",
        "grayscale",
        "invert",
        "sepia",
      ];

      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];

        if (grade.fx[f] !== undefined) {
          this[fxKey][f] = grade.fx[f];
        }
      }

      deckMixer.setFx(deck, this[fxKey]);
    },

    setMasterHueSpin(value) {
      this.masterHueSpin = parseFloat(value);
      deckMixer._masterHueSpin = this.masterHueSpin;
    },

    setPixelate(value) {
      this.pixelate = parseInt(value, 10);
      deckMixer.setPixelate(this.pixelate);
    },

    toggleGlitch() {
      this.glitchEnabled = !this.glitchEnabled;
      deckMixer.setGlitch(this.glitchEnabled, this.glitchIntensity);
    },

    toggleStrobe() {
      this.strobeEnabled = !this.strobeEnabled;
      deckMixer.setStrobe(this.strobeEnabled, this.strobeHz);
    },

    setStrobeHz(value) {
      this.strobeHz = parseFloat(value);
      deckMixer.setStrobe(this.strobeEnabled, this.strobeHz);
    },

    setMasterFxParam(param, value) {
      const v = parseFloat(value);
      if (param === "contrast") {
        this.masterContrast = v;
      } else if (param === "saturation") {
        this.masterSaturation = v;
      } else if (param === "hue") {
        this.masterHue = v;
      }
      deckMixer.setMasterFx({
        contrast: this.masterContrast,
        saturation: this.masterSaturation,
        hue: this.masterHue,
      });
    },

    resetMasterFxParam(param) {
      if (param === "contrast") {
        this.masterContrast = 1.0;
      } else if (param === "saturation") {
        this.masterSaturation = 1.0;
      } else if (param === "hue") {
        this.masterHue = 0;
      }
      deckMixer.setMasterFx({
        contrast: this.masterContrast,
        saturation: this.masterSaturation,
        hue: this.masterHue,
      });
    },

    toggleRecording() {
      if (this.isRecording) {
        deckMixer.stopRecording();
        this.isRecording = false;
        clearInterval(this._recordInterval);
        this._recordInterval = null;
        this.recordElapsed = 0;
      } else {
        deckMixer.startRecording();
        this.isRecording = true;
        this.recordElapsed = 0;
        this._recordInterval = setInterval(() => {
          this.recordElapsed = deckMixer.getRecordingElapsedMs();
        }, 500);
      }
    },

    formatRecordElapsed(ms) {
      const s = Math.floor(ms / 1000);
      const m = Math.floor(s / 60);
      const ss = String(s % 60).padStart(2, "0");
      return `${m}:${ss}`;
    },

    async toggleCam(deck) {
      const isOn = deck === "A" ? this.camA : this.camB;
      const player = deck === "A" ? deckMixer.playerA : deckMixer.playerB;

      if (isOn) {
        player.stop();
        if (deck === "A") {
          this.camA = false;
        } else {
          this.camB = false;
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        await player.playStream(stream);

        if (deck === "A") {
          this.camA = true;
        } else {
          this.camB = true;
        }
      } catch (err) {
        console.warn("[ClipLauncher] Webcam access denied:", err);
      }
    },

    setOutputResolution(r) {
      this.outputResolution = r.label;
      deckMixer.setResolution(r.w, r.h);
    },

    saveSession() {
      const state = this.$store.state["clip-launcher"];
      const slots = {};
      const decks = ["A", "B"];
      for (let d = 0; d < decks.length; d++) {
        const deck = decks[d];
        slots[deck] = [];
        const deckSlots = state.decks[deck];
        for (let row = 0; row < deckSlots.length; row++) {
          const rowOut = [];
          for (let col = 0; col < deckSlots[row].length; col++) {
            const slot = deckSlots[row][col];
            if (slot.source && slot.source.path) {
              rowOut.push({
                row,
                col,
                source: {
                  name: slot.source.name,
                  path: slot.source.path,
                  duration: slot.source.duration || 0,
                },
                loopMode: slot.loopMode,
                speed: slot.speed,
                bpmSyncBeats: slot.bpmSyncBeats || 0,
                loopIn: slot.loopIn || 0,
                loopOut: slot.loopOut !== undefined ? slot.loopOut : 1,
              });
            }
          }
          for (let i = 0; i < rowOut.length; i++) {
            slots[deck].push(rowOut[i]);
          }
        }
      }
      const session = {
        version: 1,
        slots,
        crossfader: state.crossfader,
        blendMode: this.blendMode,
        fxA: Object.assign({}, this.fxA),
        fxB: Object.assign({}, this.fxB),
        chromaA: this.chromaA,
        chromaB: this.chromaB,
        opacityA: this.opacityA,
        opacityB: this.opacityB,
        mirrorA: this.mirrorA,
        mirrorB: this.mirrorB,
        tileModeA: this.tileModeA,
        tileModeB: this.tileModeB,
        transformA: Object.assign({}, this.transformA),
        transformB: Object.assign({}, this.transformB),
        masterBrightness: this.masterBrightness,
        masterContrast: this.masterContrast,
        masterSaturation: this.masterSaturation,
        masterHue: this.masterHue,
        masterHueSpin: this.masterHueSpin,
        trailEnabled: this.trailEnabled,
        trailDecay: this.trailDecay,
        pixelate: this.pixelate,
        glitchEnabled: this.glitchEnabled,
        glitchIntensity: this.glitchIntensity,
        strobeEnabled: this.strobeEnabled,
        strobeHz: this.strobeHz,
        masterSpeedA: this.masterSpeedA,
        masterSpeedB: this.masterSpeedB,
        scenePresets: JSON.parse(JSON.stringify(this.scenePresets)),
      };
      const blob = new Blob([JSON.stringify(session, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "grackle-session.json";
      a.click();
      URL.revokeObjectURL(url);
    },

    async loadSession(file) {
      if (!file) {
        return;
      }
      let session;
      try {
        const text = await file.text();
        session = JSON.parse(text);
      } catch (err) {
        console.warn("[Grackle] Failed to parse session file:", err);
        return;
      }

      // Restore crossfader
      if (typeof session.crossfader === "number") {
        clipLauncher.setCrossfader(session.crossfader);
      }

      // Restore clips
      const decks = ["A", "B"];
      for (let d = 0; d < decks.length; d++) {
        const deck = decks[d];
        const deckSlots = session.slots && session.slots[deck];
        if (!deckSlots) {
          continue;
        }
        for (let i = 0; i < deckSlots.length; i++) {
          const entry = deckSlots[i];
          if (!entry || !entry.source || !entry.source.path) {
            continue;
          }
          const filePath = entry.source.path;
          const fileUrl = filePath.startsWith("file://")
            ? filePath
            : `file://${filePath}`;
          const source = {
            name: entry.source.name || filePath.split(/[\\/]/).pop(),
            path: filePath,
            url: fileUrl,
            duration: entry.source.duration || 0,
          };
          try {
            await clipLauncher.loadClip(deck, entry.row, entry.col, source);
            clipLauncher.updateSlotSettings(deck, entry.row, entry.col, {
              loopMode: entry.loopMode || "loop",
              speed: entry.speed || 1.0,
              bpmSyncBeats: entry.bpmSyncBeats || 0,
              loopIn: entry.loopIn || 0,
              loopOut: entry.loopOut !== undefined ? entry.loopOut : 1,
            });
          } catch (err) {
            console.warn(
              "[Grackle] Session load: failed slot",
              deck,
              entry.row,
              entry.col,
              err
            );
          }
        }
      }

      // Restore FX
      const fx = [
        ["fxA", "A"],
        ["fxB", "B"],
      ];
      for (let i = 0; i < fx.length; i++) {
        const key = fx[i][0];
        const deck = fx[i][1];
        if (session[key]) {
          const src = session[key];
          const dest = key === "fxA" ? this.fxA : this.fxB;
          const fields = [
            "brightness",
            "contrast",
            "saturation",
            "hue",
            "blur",
            "grayscale",
            "invert",
            "sepia",
          ];
          for (let f = 0; f < fields.length; f++) {
            if (src[fields[f]] !== undefined) {
              dest[fields[f]] = src[fields[f]];
            }
          }
          deckMixer.setFx(deck, Object.assign({}, dest));
        }
      }

      if (session.blendMode) {
        this.blendMode = session.blendMode;
        deckMixer.setBlendMode(session.blendMode);
      }
      if (typeof session.chromaA === "number") {
        this.chromaA = session.chromaA;
        deckMixer.setChroma("A", session.chromaA);
      }
      if (typeof session.chromaB === "number") {
        this.chromaB = session.chromaB;
        deckMixer.setChroma("B", session.chromaB);
      }
      if (typeof session.opacityA === "number") {
        this.opacityA = session.opacityA;
        deckMixer.setOpacity("A", session.opacityA);
      }
      if (typeof session.opacityB === "number") {
        this.opacityB = session.opacityB;
        deckMixer.setOpacity("B", session.opacityB);
      }
      if (session.mirrorA !== undefined) {
        this.mirrorA = session.mirrorA;
        deckMixer.setMirror("A", session.mirrorA);
      }
      if (session.mirrorB !== undefined) {
        this.mirrorB = session.mirrorB;
        deckMixer.setMirror("B", session.mirrorB);
      }
      if (session.tileModeA !== undefined) {
        this.tileModeA = session.tileModeA;
        deckMixer.setTileMode("A", session.tileModeA);
      }
      if (session.tileModeB !== undefined) {
        this.tileModeB = session.tileModeB;
        deckMixer.setTileMode("B", session.tileModeB);
      }
      if (session.transformA) {
        this.transformA = Object.assign({}, session.transformA);
        deckMixer.setTransform("A", this.transformA);
      }
      if (session.transformB) {
        this.transformB = Object.assign({}, session.transformB);
        deckMixer.setTransform("B", this.transformB);
      }
      if (typeof session.masterBrightness === "number") {
        this.masterBrightness = session.masterBrightness;
        deckMixer.setMasterBrightness(session.masterBrightness);
      }
      if (
        typeof session.masterContrast === "number" ||
        typeof session.masterSaturation === "number" ||
        typeof session.masterHue === "number"
      ) {
        if (typeof session.masterContrast === "number") {
          this.masterContrast = session.masterContrast;
        }
        if (typeof session.masterSaturation === "number") {
          this.masterSaturation = session.masterSaturation;
        }
        if (typeof session.masterHue === "number") {
          this.masterHue = session.masterHue;
        }
        deckMixer.setMasterFx({
          contrast: this.masterContrast,
          saturation: this.masterSaturation,
          hue: this.masterHue,
        });
      }
      if (typeof session.masterHueSpin === "number") {
        this.masterHueSpin = session.masterHueSpin;
        deckMixer._masterHueSpin = session.masterHueSpin;
      }
      if (session.trailEnabled !== undefined) {
        this.trailEnabled = session.trailEnabled;
        deckMixer.setTrail(
          session.trailEnabled,
          session.trailDecay || this.trailDecay
        );
      }
      if (typeof session.trailDecay === "number") {
        this.trailDecay = session.trailDecay;
      }
      if (typeof session.pixelate === "number") {
        this.pixelate = session.pixelate;
        deckMixer.setPixelate(session.pixelate);
      }
      if (session.glitchEnabled !== undefined) {
        this.glitchEnabled = session.glitchEnabled;
        deckMixer.setGlitch(
          session.glitchEnabled,
          session.glitchIntensity || this.glitchIntensity
        );
      }
      if (typeof session.glitchIntensity === "number") {
        this.glitchIntensity = session.glitchIntensity;
      }
      if (session.strobeEnabled !== undefined) {
        this.strobeEnabled = session.strobeEnabled;
        deckMixer.setStrobe(
          session.strobeEnabled,
          session.strobeHz || this.strobeHz
        );
      }
      if (typeof session.strobeHz === "number") {
        this.strobeHz = session.strobeHz;
      }
      if (typeof session.masterSpeedA === "number") {
        this.masterSpeedA = session.masterSpeedA;
        deckMixer.setMasterSpeed("A", session.masterSpeedA);
      }
      if (typeof session.masterSpeedB === "number") {
        this.masterSpeedB = session.masterSpeedB;
        deckMixer.setMasterSpeed("B", session.masterSpeedB);
      }
      if (Array.isArray(session.scenePresets)) {
        this.scenePresets = session.scenePresets.slice(0, 16);
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
  container-type: inline-size;
  container-name: launcher;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(140px, 200px) minmax(0, 1fr);
  gap: 10px;
  height: 100%;
  padding: 10px;
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

.popover-copy {
  font-size: 0.7rem;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(80, 160, 255, 0.4);
  background: rgba(60, 100, 255, 0.1);
  color: rgba(120, 180, 255, 0.9);
  cursor: pointer;
  transition: background 120ms ease;
}

.popover-copy:hover {
  background: rgba(60, 100, 255, 0.22);
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
  cursor: col-resize;
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

.lfo-controls-row {
  display: flex;
  gap: 3px;
  align-items: center;
  padding: 2px 0;
}

.lfo-sep {
  color: rgba(255, 255, 255, 0.2);
  font-size: 0.7rem;
  margin: 0 2px;
}

.lfo-shape-btn {
  padding: 2px 5px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.4);
  border-radius: 3px;
  font-size: 0.58rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
}

.lfo-shape-btn:hover {
  border-color: rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.8);
}

.lfo-shape-active {
  border-color: var(--grackle-accent-2, #7c3aff);
  color: #a78bff;
  background: rgba(124, 58, 255, 0.12);
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

/* Blackout button */
.blackout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 2px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(20, 20, 22, 0.95);
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  padding: 8px 10px;
  cursor: pointer;
  user-select: none;
  transition: border-color 80ms ease, background 80ms ease, color 80ms ease,
    box-shadow 80ms ease;
}

.blackout-btn:hover {
  border-color: rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.7);
}

.blackout-active {
  border-color: #fff;
  color: #fff;
  background: #000;
  box-shadow: 0 0 24px rgba(0, 0, 0, 0.9),
    inset 0 0 12px rgba(255, 255, 255, 0.05);
}

/* Blackout / Whiteout row */
.blackout-row {
  display: flex;
  gap: 4px;
}

.blackout-row .blackout-btn,
.whiteout-btn {
  flex: 1;
}

.whiteout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 2px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(20, 20, 22, 0.95);
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  padding: 8px 10px;
  cursor: pointer;
  user-select: none;
  transition: border-color 80ms ease, background 80ms ease, color 80ms ease,
    box-shadow 80ms ease;
}

.whiteout-btn:hover {
  border-color: rgba(255, 255, 255, 0.4);
  color: rgba(255, 255, 255, 0.8);
}

.whiteout-active {
  border-color: #fff;
  color: #000;
  background: #fff;
  box-shadow: 0 0 32px rgba(255, 255, 255, 0.6),
    inset 0 0 12px rgba(255, 255, 255, 0.3);
}

/* Blend mode buttons */
.blend-mode-btns {
  display: flex;
  gap: 3px;
  justify-content: center;
}

.blend-mode-btn {
  flex: 1;
  padding: 3px 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  font-size: 0.58rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  letter-spacing: 0.02em;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
}

.blend-mode-btn:hover {
  border-color: rgba(255, 255, 255, 0.22);
  color: rgba(255, 255, 255, 0.7);
}

.blend-mode-active {
  border-color: var(--grackle-accent-2, #7c3aff);
  color: #a78bff;
  background: rgba(124, 58, 255, 0.12);
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

/* Column triggers */
.col-triggers {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
}

.col-trigger-btn {
  aspect-ratio: 1 / 1;
  border: 1px solid rgba(255, 200, 60, 0.18);
  background: rgba(36, 39, 47, 0.9);
  color: rgba(255, 200, 60, 0.4);
  border-radius: 5px;
  font-size: 0.52rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.col-trigger-btn:hover {
  border-color: rgba(255, 200, 60, 0.7);
  color: rgba(255, 200, 60, 0.9);
  background: rgba(255, 200, 60, 0.08);
}

.col-trigger-btn:active {
  transform: scale(0.92);
}

/* Speed ramp buttons */
.deck-ramp-btn {
  padding: 2px 5px;
  border: 1px solid rgba(100, 180, 255, 0.2);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(100, 180, 255, 0.55);
  border-radius: 4px;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
  user-select: none;
}

.deck-ramp-btn:hover {
  border-color: rgba(100, 180, 255, 0.6);
  color: rgba(140, 200, 255, 0.9);
}

.deck-ramp-active {
  background: rgba(100, 180, 255, 0.15);
  border-color: #64b4ff;
  color: #9dd0ff;
}

/* Reverse button */
.deck-rev-btn {
  padding: 2px 5px;
  border: 1px solid rgba(255, 120, 60, 0.2);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 120, 60, 0.55);
  border-radius: 4px;
  font-size: 0.56rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
}

.deck-rev-btn:hover {
  border-color: rgba(255, 120, 60, 0.7);
  color: rgba(255, 150, 80, 0.95);
}

.deck-rev-active {
  background: rgba(255, 80, 30, 0.18);
  border-color: #ff7830;
  color: #ffaa70;
}

/* QBEAT button */
.deck-qbeat-btn {
  padding: 2px 5px;
  border: 1px solid rgba(80, 220, 100, 0.2);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(80, 220, 100, 0.5);
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: 900;
  cursor: pointer;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
}

.deck-qbeat-btn:hover {
  border-color: rgba(80, 220, 100, 0.6);
  color: rgba(100, 240, 120, 0.9);
}

.deck-qbeat-active {
  background: rgba(60, 200, 80, 0.15);
  border-color: #3cc850;
  color: #70e880;
}

/* Chroma slider accent */
.fx-slider-chroma {
  accent-color: #ff4488;
}

/* Color grade preset row */
.deck-grade-row {
  display: flex;
  gap: 4px;
  padding: 3px 0;
}

.grade-btn {
  flex: 1;
  padding: 3px 2px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.45);
  border-radius: 4px;
  font-size: 0.52rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
}

.grade-btn:hover {
  border-color: rgba(255, 180, 80, 0.6);
  color: rgba(255, 200, 100, 0.9);
  background: rgba(255, 180, 60, 0.08);
}

.grade-btn:active {
  transform: scale(0.94);
}

/* Deck FX controls */
.deck-fx-toggle {
  padding: 2px 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.35);
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
}

.deck-fx-toggle:hover {
  border-color: rgba(255, 180, 60, 0.5);
  color: rgba(255, 200, 80, 0.9);
}

.deck-fx-open {
  border-color: rgba(255, 180, 60, 0.6);
  color: rgba(255, 200, 80, 0.95);
  background: rgba(255, 160, 40, 0.1);
}

.deck-fx-row {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 2px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 4px;
}

.fx-label {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(255, 200, 80, 0.7);
  white-space: nowrap;
  min-width: 20px;
}

.fx-slider {
  flex: 1;
  min-width: 0;
  height: 3px;
  accent-color: rgba(255, 180, 60, 0.8);
}

.fx-reset-btn {
  padding: 2px 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.35);
  border-radius: 4px;
  font-size: 0.7rem;
  cursor: pointer;
}

.fx-reset-btn:hover {
  color: rgba(255, 255, 255, 0.7);
  border-color: rgba(255, 255, 255, 0.2);
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

/* Freeze button */
.deck-freeze-btn {
  padding: 2px 7px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.35);
  border-radius: 4px;
  font-size: 0.62rem;
  cursor: pointer;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
  line-height: 1;
}

.deck-freeze-btn:hover {
  border-color: rgba(120, 200, 255, 0.5);
  color: rgba(140, 210, 255, 0.8);
}

.deck-freeze-active {
  border-color: #7bcfff;
  color: #7bcfff;
  background: rgba(120, 200, 255, 0.12);
  box-shadow: 0 0 12px rgba(100, 180, 255, 0.25);
  animation: freeze-flicker 2s ease-in-out infinite;
}

@keyframes freeze-flicker {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.75;
  }
}

/* Stutter button */
.deck-stutter-btn {
  padding: 2px 5px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.35);
  border-radius: 4px;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  user-select: none;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
}

.deck-stutter-btn:hover {
  border-color: rgba(255, 100, 255, 0.5);
  color: rgba(255, 120, 255, 0.8);
}

.deck-stutter-active {
  border-color: #ff66ff;
  color: #ff66ff;
  background: rgba(255, 80, 255, 0.12);
  box-shadow: 0 0 12px rgba(255, 80, 255, 0.25);
  animation: stutter-glow 100ms step-start infinite;
}

@keyframes stutter-glow {
  0%,
  50% {
    opacity: 1;
  }
  25%,
  75% {
    opacity: 0.6;
  }
}

/* Auto-trigger deck button */
.deck-auto-btn {
  padding: 2px 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.35);
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease,
    box-shadow 80ms ease;
}

.deck-auto-btn:hover {
  border-color: rgba(255, 200, 60, 0.5);
  color: rgba(255, 220, 80, 0.9);
}

.deck-auto-active {
  border-color: #ffd740;
  color: #ffd740;
  background: rgba(255, 215, 64, 0.1);
  box-shadow: 0 0 12px rgba(255, 200, 64, 0.2);
  animation: auto-pulse 800ms ease-in-out infinite;
}

@keyframes auto-pulse {
  0%,
  100% {
    box-shadow: 0 0 8px rgba(255, 200, 64, 0.15);
  }
  50% {
    box-shadow: 0 0 18px rgba(255, 200, 64, 0.4);
  }
}

/* Output resolution selector */
.res-row {
  display: flex;
  gap: 3px;
  margin-bottom: 5px;
}

.res-btn {
  flex: 1;
  padding: 3px 2px;
  font-size: 9px;
  font-weight: 700;
  background: #1a1a2e;
  border: 1px solid #444;
  color: #888;
  border-radius: 3px;
  cursor: pointer;
  letter-spacing: 0.03em;
}

.res-btn:hover {
  background: #252540;
  color: #ccc;
}

.res-btn-active {
  background: #2a2a50;
  border-color: #6666cc;
  color: #aaf;
}

/* Session save/load */
.session-row {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
}

.session-btn {
  flex: 1;
  padding: 4px 2px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  background: #1a1a2e;
  border: 1px solid #444;
  color: #aaa;
  border-radius: 3px;
  cursor: pointer;
}

.session-btn:hover {
  background: #252540;
  color: #fff;
  border-color: #888;
}

/* Scene presets */
.scene-presets {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.scene-presets-label {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.4);
  white-space: nowrap;
}

.scene-preset-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 3px;
}

.scene-preset-btn {
  position: relative;
  padding: 4px 2px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.3);
  border-radius: 5px;
  font-size: 0.65rem;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease,
    box-shadow 80ms ease;
}

.scene-preset-btn:hover {
  border-color: rgba(255, 255, 255, 0.28);
  color: rgba(255, 255, 255, 0.7);
}

.scene-preset-btn:active {
  transform: scale(0.92);
}

.scene-preset-saved {
  border-color: rgba(93, 255, 147, 0.4);
  color: rgba(93, 255, 147, 0.8);
  background: rgba(93, 255, 147, 0.06);
}

.scene-preset-saved:hover {
  border-color: rgba(93, 255, 147, 0.7);
  color: #5dff93;
  box-shadow: 0 0 10px rgba(93, 255, 147, 0.15);
}

.scene-preset-dot {
  position: absolute;
  top: 2px;
  right: 3px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #5dff93;
  box-shadow: 0 0 4px rgba(93, 255, 147, 0.6);
}

/* Auto-crossfade row */
.cf-auto-row {
  display: flex;
  align-items: center;
  gap: 3px;
}

.cf-auto-btn {
  flex: 2;
  padding: 4px 6px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.5);
  border-radius: 5px;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease,
    box-shadow 80ms ease;
}

.cf-auto-btn:hover {
  border-color: rgba(93, 255, 147, 0.45);
  color: rgba(93, 255, 147, 0.85);
}

.cf-auto-active {
  border-color: #5dff93;
  color: #5dff93;
  background: rgba(93, 255, 147, 0.1);
  box-shadow: 0 0 12px rgba(93, 255, 147, 0.2);
  animation: auto-pulse 600ms ease-in-out infinite;
}

.cf-auto-dur-btn {
  flex: 1;
  padding: 3px 3px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.35);
  border-radius: 4px;
  font-size: 0.58rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
}

.cf-auto-dur-btn:hover {
  border-color: rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.7);
}

.cf-auto-dur-active {
  border-color: rgba(93, 255, 147, 0.5);
  color: rgba(93, 255, 147, 0.85);
  background: rgba(93, 255, 147, 0.08);
}

/* Deck transform row (X / Y / scale) */
.deck-transform-row {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 2px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  margin-bottom: 2px;
}

.deck-transform-row .fx-label {
  color: rgba(120, 200, 255, 0.7);
}

.deck-transform-row .fx-slider {
  accent-color: rgba(120, 200, 255, 0.7);
}

/* Tile mode button */
.deck-tile-btn {
  padding: 2px 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.35);
  border-radius: 4px;
  font-size: 0.7rem;
  cursor: pointer;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
}

.deck-tile-btn:hover {
  border-color: rgba(255, 160, 80, 0.5);
  color: rgba(255, 180, 100, 0.85);
}

.deck-tile-active {
  border-color: #ffb060;
  color: #ffb060;
  background: rgba(255, 140, 50, 0.1);
  box-shadow: 0 0 10px rgba(255, 130, 40, 0.2);
}

/* Mirror button */
.deck-mirror-btn {
  padding: 2px 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.35);
  border-radius: 4px;
  font-size: 0.7rem;
  cursor: pointer;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
}

.deck-mirror-btn:hover {
  border-color: rgba(180, 120, 255, 0.5);
  color: rgba(200, 150, 255, 0.8);
}

.deck-mirror-active {
  border-color: #c084ff;
  color: #c084ff;
  background: rgba(180, 100, 255, 0.12);
  box-shadow: 0 0 10px rgba(180, 100, 255, 0.2);
}

/* Trail decay row */
.trail-decay-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.trail-decay-label {
  font-size: 0.58rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  min-width: 52px;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}

.trail-decay-slider {
  flex: 1;
  height: 3px;
  accent-color: rgba(255, 255, 255, 0.6);
}

/* Strobe */
.strobe-hz-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.strobe-hz-label {
  font-size: 0.58rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  min-width: 38px;
  font-variant-numeric: tabular-nums;
}

.strobe-hz-slider {
  flex: 1;
  height: 3px;
  accent-color: #ff9900;
}

.beat-strobe-toggle.sync-toggle-active {
  background: rgba(255, 153, 0, 0.18);
  border-color: #ff9900;
  color: #ffb84d;
}

.beat-glitch-toggle.sync-toggle-active {
  background: rgba(255, 60, 200, 0.18);
  border-color: #ff3cc8;
  color: #ff80dd;
}

.pixelate-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pixelate-label {
  font-size: 0.55rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.45);
  white-space: nowrap;
  min-width: 44px;
  font-variant-numeric: tabular-nums;
}

.pixelate-slider {
  flex: 1;
  height: 3px;
  accent-color: #ff3cc8;
}

/* Master output FX */
.master-fx-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.master-fx-label {
  font-size: 0.55rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 0.06em;
  padding-top: 2px;
  min-width: 18px;
}

.master-fx-sliders {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.master-fx-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.master-fx-item-label {
  font-size: 0.52rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  min-width: 20px;
  letter-spacing: 0.04em;
}

.master-fx-slider {
  flex: 1;
  height: 3px;
  accent-color: #00d4aa;
}

/* REC button */
.rec-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 60, 60, 0.3);
  border-radius: 4px;
  color: rgba(255, 80, 80, 0.7);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
}

.rec-btn:hover {
  border-color: rgba(255, 60, 60, 0.7);
  color: #ff5050;
}

.rec-btn-active {
  background: rgba(255, 30, 30, 0.12);
  border-color: #ff3c3c;
  color: #ff6060;
  animation: rec-pulse 1s ease-in-out infinite;
}

@keyframes rec-pulse {
  0%,
  100% {
    border-color: #ff3c3c;
  }
  50% {
    border-color: rgba(255, 60, 60, 0.3);
  }
}

.rec-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

/* Webcam button */
.deck-cam-btn {
  padding: 2px 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.35);
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease,
    box-shadow 80ms ease;
}

.deck-cam-btn:hover {
  border-color: rgba(0, 220, 255, 0.5);
  color: rgba(0, 235, 255, 0.8);
}

.deck-cam-active {
  border-color: #00ddff;
  color: #00ddff;
  background: rgba(0, 200, 255, 0.1);
  box-shadow: 0 0 12px rgba(0, 200, 255, 0.25);
  animation: cam-pulse 2s ease-in-out infinite;
}

@keyframes cam-pulse {
  0%,
  100% {
    box-shadow: 0 0 8px rgba(0, 200, 255, 0.2);
  }
  50% {
    box-shadow: 0 0 18px rgba(0, 200, 255, 0.5);
  }
}

/* Auto-trigger beat division row */
.auto-div-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.auto-div-label {
  font-size: 0.58rem;
  font-weight: 700;
  color: rgba(255, 215, 64, 0.7);
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.auto-div-btn {
  flex: 1;
  padding: 3px 4px;
  border: 1px solid rgba(255, 215, 64, 0.2);
  background: rgba(255, 215, 64, 0.04);
  color: rgba(255, 215, 64, 0.5);
  border-radius: 4px;
  font-size: 0.62rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
}

.auto-div-btn:hover {
  border-color: rgba(255, 215, 64, 0.5);
  color: rgba(255, 215, 64, 0.85);
}

.auto-div-active {
  border-color: #ffd740;
  color: #ffd740;
  background: rgba(255, 215, 64, 0.12);
}

/* Master brightness */
.master-brightness-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.master-brightness-label {
  font-size: 0.58rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  min-width: 40px;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}

.master-brightness-slider {
  flex: 1;
  accent-color: rgba(255, 255, 255, 0.6);
}

/* PANIC button */
.panic-btn {
  padding: 7px 10px;
  border: 2px solid rgba(255, 60, 60, 0.4);
  border-radius: 8px;
  background: rgba(255, 40, 40, 0.07);
  color: rgba(255, 80, 80, 0.65);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease,
    box-shadow 80ms ease;
}

.panic-btn:hover {
  border-color: rgba(255, 60, 60, 0.8);
  color: rgba(255, 80, 80, 1);
  background: rgba(255, 40, 40, 0.16);
  box-shadow: 0 0 16px rgba(255, 40, 40, 0.2);
}

.panic-btn:active {
  transform: scale(0.96);
  border-color: #ff3c3c;
  box-shadow: 0 0 24px rgba(255, 40, 40, 0.4);
}

/* Beat effects row (flash + zoom side by side) */
.beat-fx-row {
  display: flex;
  gap: 4px;
}

.beat-fx-row .sync-toggle {
  flex: 1;
  padding: 6px 4px;
}

/* Solo deck buttons */
.solo-btns {
  display: flex;
  gap: 4px;
}

.solo-btn {
  flex: 1;
  padding: 4px 6px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: background 80ms ease, border-color 80ms ease, color 80ms ease,
    box-shadow 80ms ease;
}

.solo-btn:hover {
  border-color: rgba(255, 255, 255, 0.28);
  color: rgba(255, 255, 255, 0.75);
}

.solo-btn-a.solo-btn-active {
  border-color: #00ff88;
  color: #00ff88;
  background: rgba(0, 255, 136, 0.12);
  box-shadow: 0 0 12px rgba(0, 255, 136, 0.2);
}

.solo-btn-b.solo-btn-active {
  border-color: #00ff88;
  color: #00ff88;
  background: rgba(0, 255, 136, 0.12);
  box-shadow: 0 0 12px rgba(0, 255, 136, 0.2);
}

/* ── Responsive: medium panel (< 1100px wide) ──────────── */
@container launcher (max-width: 1100px) {
  .clip-launcher {
    gap: 6px;
    padding: 8px;
    grid-template-columns: minmax(0, 1fr) minmax(130px, 170px) minmax(0, 1fr);
  }

  .deck-grid {
    gap: 4px;
  }

  .clip-slot {
    padding: 2px;
    border-radius: 4px;
  }

  .slot-index,
  .slot-name,
  .slot-meta {
    font-size: 0.58rem;
  }

  .slot-empty-icon {
    font-size: 0.9rem;
  }

  .deck-header {
    gap: 3px;
  }

  .sync-toggle {
    padding: 5px 7px;
    font-size: 0.65rem;
  }

  .scene-preset-btn {
    padding: 3px 1px;
    font-size: 0.6rem;
  }

  .speed-preset-btn {
    padding: 1px 3px;
    font-size: 0.55rem;
  }

  .deck-title {
    font-size: 0.7rem;
  }
}

/* ── Responsive: compact panel (< 860px wide) ──────────── */
@container launcher (max-width: 860px) {
  .clip-launcher {
    gap: 4px;
    padding: 6px;
    grid-template-columns: minmax(0, 1fr) minmax(110px, 140px) minmax(0, 1fr);
  }

  .deck-grid {
    gap: 3px;
  }

  .clip-slot {
    padding: 1px;
    border-radius: 3px;
  }

  .slot-index,
  .slot-name,
  .slot-meta {
    font-size: 0.52rem;
  }

  .slot-empty-icon {
    font-size: 0.75rem;
  }

  /* Hide secondary controls to recover space */
  .deck-fx-row,
  .deck-grade-row,
  .deck-transform-row,
  .lfo-rate-row,
  .lfo-controls-row {
    display: none;
  }

  .sync-toggle {
    padding: 4px 5px;
    font-size: 0.6rem;
    gap: 4px;
  }

  .scene-preset-btn {
    padding: 2px 1px;
    font-size: 0.55rem;
  }

  .speed-preset-btn {
    padding: 1px 2px;
    font-size: 0.52rem;
  }

  .deck-title {
    font-size: 0.65rem;
    letter-spacing: 0.04em;
  }

  .crossfader-column {
    gap: 6px;
  }

  .output-preview {
    display: none;
  }
}

/* ── Responsive: stacked (< 680px wide) ────────────────── */
@container launcher (max-width: 680px) {
  .clip-launcher {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    gap: 4px;
    overflow-y: auto;
  }

  .crossfader-column {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
  }

  .crossfader-labels {
    flex-direction: row;
    justify-content: space-between;
  }

  .crossfader {
    writing-mode: initial;
    -webkit-appearance: none;
    min-height: 0;
    height: 32px;
    width: 100%;
  }

  .scene-preset-grid {
    grid-template-columns: repeat(16, 1fr);
  }
}

/* ── Wizard help button ──────────────────────────────── */
.wizard-help-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.7rem;
  font-weight: 700;
  width: 18px;
  height: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  flex-shrink: 0;
  transition: border-color 120ms ease, color 120ms ease;
}
.wizard-help-btn:hover {
  border-color: rgba(93, 255, 147, 0.6);
  color: rgba(93, 255, 147, 0.9);
}

/* ── Wizard overlay ─────────────────────────────────── */
.wizard-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(5px);
}

.wizard-panel {
  background: #1a1d24;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  padding: 28px 32px 22px;
  width: 480px;
  max-width: calc(100vw - 48px);
  box-shadow: 0 28px 72px rgba(0, 0, 0, 0.85);
  position: relative;
}

.wizard-steps {
  display: flex;
  gap: 6px;
  justify-content: center;
  margin-bottom: 22px;
}
.wizard-step-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  transition: background 180ms ease;
}
.wizard-step-dot-active {
  background: rgba(93, 255, 147, 0.85);
}

.wizard-title {
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 12px;
}

.wizard-body {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.55;
}
.wizard-body p {
  margin: 0 0 12px;
}
.wizard-body strong {
  color: rgba(255, 255, 255, 0.9);
}

.wizard-hint {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.35);
  margin-top: 8px !important;
}

/* diagram */
.wizard-diagram {
  display: flex;
  gap: 6px;
  margin: 14px 0;
  align-items: center;
  justify-content: center;
}
.wd-box {
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.4;
}
.wd-sub {
  font-weight: 400;
  font-size: 0.62rem;
  letter-spacing: 0.04em;
  opacity: 0.65;
}
.wd-deck {
  background: rgba(93, 255, 147, 0.1);
  border: 1px solid rgba(93, 255, 147, 0.3);
  color: rgba(93, 255, 147, 0.9);
  flex: 1;
}
.wd-cf {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
}

/* how-to list */
.wizard-how-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 8px 0 14px;
}
.wizard-how-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.wizard-how-icon {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 5px;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.6);
  padding: 3px 7px;
  flex-shrink: 0;
  min-width: 44px;
  text-align: center;
}
.wizard-how-item kbd {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 0.68rem;
  font-family: monospace;
  color: #fff;
}

/* templates list */
.wizard-templates {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px 16px;
  margin: 10px 0 16px;
  max-height: 260px;
  overflow-y: auto;
}
.wizard-template-row {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.73rem;
}
.wt-num {
  width: 22px;
  height: 22px;
  border-radius: 5px;
  background: rgba(93, 255, 147, 0.12);
  border: 1px solid rgba(93, 255, 147, 0.3);
  color: rgba(93, 255, 147, 0.9);
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.wt-name {
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #fff;
  width: 46px;
  flex-shrink: 0;
}
.wt-desc {
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.73rem;
}

.wizard-load-btn {
  background: rgba(93, 255, 147, 0.12);
  border: 1px solid rgba(93, 255, 147, 0.45);
  border-radius: 7px;
  color: rgba(93, 255, 147, 0.95);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  padding: 8px 20px;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
  width: 100%;
}
.wizard-load-btn:hover {
  background: rgba(93, 255, 147, 0.22);
  border-color: rgba(93, 255, 147, 0.7);
}
.wizard-load-btn-done {
  background: rgba(93, 255, 147, 0.22);
  border-color: rgba(93, 255, 147, 0.7);
  cursor: default;
}

/* navigation */
.wizard-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 22px;
  gap: 10px;
}
.wizard-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 7px;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  padding: 7px 18px;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}
.wizard-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.38);
}
.wizard-btn-ghost {
  background: none;
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.45);
}
.wizard-btn-ghost:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.7);
}

.wizard-skip {
  text-align: center;
  margin-top: 12px;
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.22);
  cursor: pointer;
  transition: color 120ms ease;
}
.wizard-skip:hover {
  color: rgba(255, 255, 255, 0.5);
}

/* transition */
.wizard-fade-enter-active,
.wizard-fade-leave-active {
  transition: opacity 180ms ease;
}
.wizard-fade-enter,
.wizard-fade-leave-to {
  opacity: 0;
}

/* ── Slot context menu ───────────────────────────────────── */
.slot-ctx-menu {
  position: fixed;
  z-index: 10000;
  background: #1a1d24;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  padding: 4px 0;
  min-width: 160px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
}
.ctx-item {
  display: block;
  width: 100%;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.78rem;
  text-align: left;
  padding: 7px 14px;
  cursor: pointer;
  transition: background 80ms ease;
}
.ctx-item:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
}
.ctx-item:disabled {
  color: rgba(255, 255, 255, 0.25);
  cursor: default;
}
.ctx-item-danger:not(:disabled) {
  color: rgba(255, 100, 100, 0.8);
}
.ctx-item-danger:not(:disabled):hover {
  background: rgba(255, 60, 60, 0.1);
}
.ctx-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 4px 0;
}

/* ── URL dialog ──────────────────────────────────────────── */
.url-dialog-panel {
  max-width: 480px;
  width: 100%;
}
.url-dialog-hint {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 12px;
}
.url-dialog-hint code {
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.76rem;
}
.url-input-field {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  color: #fff;
  font-size: 0.82rem;
  padding: 9px 12px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 120ms ease;
}
.url-input-field:focus {
  border-color: rgba(93, 255, 147, 0.5);
}
.url-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

/* ── Footage library ─────────────────────────────────────── */
.library-panel {
  max-width: 560px;
  width: 100%;
}
.library-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.lib-tab {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 80ms ease;
}
.lib-tab:hover {
  border-color: rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.8);
}
.lib-tab-active {
  border-color: rgba(93, 255, 147, 0.5);
  color: rgba(93, 255, 147, 0.9);
  background: rgba(93, 255, 147, 0.06);
}
.library-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 12px;
}
.library-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 7px;
  padding: 8px 12px;
}
.lib-item-name {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
}
.lib-item-url {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.28);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 320px;
}
.lib-load-btn {
  flex-shrink: 0;
  background: rgba(93, 255, 147, 0.1);
  border: 1px solid rgba(93, 255, 147, 0.3);
  color: rgba(93, 255, 147, 0.9);
  border-radius: 5px;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 5px 10px;
  cursor: pointer;
  transition: all 80ms ease;
}
.lib-load-btn:hover {
  background: rgba(93, 255, 147, 0.18);
  border-color: rgba(93, 255, 147, 0.6);
}
.library-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.3);
}
</style>
