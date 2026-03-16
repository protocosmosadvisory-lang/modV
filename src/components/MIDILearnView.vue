<template>
  <section
    v-infoView="{ title: iVTitle, body: iVBody, id: 'MIDI Learn View' }"
    v-searchTerms="{
      terms: ['midi', 'learn', 'monitor', 'clock', 'input'],
      title: 'MIDI Learn View',
      type: 'Panel',
    }"
    class="midi-learn-view"
    :class="{ 'midi-learn-view-learning': learningActive }"
  >
    <grid columns="4" class="midi-learn-view__summary">
      <c span="1">
        <div class="midi-learn-view__tile midi-learn-view__tile-learnable">
          <div class="midi-learn-view__tileLabel">Devices</div>
          <div class="midi-learn-view__tileValue">{{ deviceCount }}</div>
        </div>
      </c>
      <c span="1">
        <div class="midi-learn-view__tile midi-learn-view__tile-learnable">
          <div class="midi-learn-view__tileLabel">Learn</div>
          <div class="midi-learn-view__tileValue">
            {{ learningActive ? "Armed" : "Idle" }}
          </div>
        </div>
      </c>
      <c span="2">
        <div class="midi-learn-view__refreshNote">
          Refresh devices: Web MIDI auto-detects inputs.
          {{ deviceCount }} device{{ deviceCount === 1 ? "" : "s" }} currently
          visible.
        </div>
      </c>
    </grid>

    <div class="midi-learn-view__toolbar">
      <Button
        class="midi-learn-view__learnButton"
        :class="{ light: !learningActive, active: learningActive }"
        @click="toggleLearnMode"
      >
        {{ learningActive ? "LEARN ARMED" : "LEARN" }}
      </Button>
      <span class="midi-learn-view__toolbarText">
        {{ learningActive ? learnActiveLabel : learnIdleLabel }}
      </span>
    </div>

    <div class="midi-learn-view__section midi-learn-view__section-learnable">
      <div class="midi-learn-view__sectionHeader">Connected MIDI Devices</div>
      <table class="midi-learn-view__table">
        <thead>
          <tr>
            <th>Device</th>
            <th>Manufacturer</th>
            <th>Status</th>
            <th>Input</th>
            <th>Clock</th>
          </tr>
        </thead>
        <tbody v-if="deviceEntries.length">
          <tr v-for="[deviceId, device] in deviceEntries" :key="deviceId">
            <td>{{ device.name }}</td>
            <td>{{ device.manufacturer || "Unknown" }}</td>
            <td>
              <span
                class="midi-learn-view__status"
                :class="{
                  'midi-learn-view__status-active': isDeviceActive(deviceId),
                  'midi-learn-view__status-inactive': !isDeviceActive(deviceId),
                }"
              >
                {{ isDeviceActive(deviceId) ? "Active" : "Inactive" }}
              </span>
            </td>
            <td>{{ device.listenForInput ? "Listening" : "Muted" }}</td>
            <td>{{ device.listenForClock ? "Listening" : "Muted" }}</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td colspan="5" class="midi-learn-view__empty">
              No MIDI devices connected.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="midi-learn-view__section midi-learn-view__section-learnable">
      <div class="midi-learn-view__sectionHeader">Live MIDI Monitor</div>
      <table class="midi-learn-view__table midi-learn-view__monitor">
        <thead>
          <tr>
            <th>Value</th>
            <th>Channel</th>
            <th>Type</th>
            <th>Device</th>
          </tr>
        </thead>
        <tbody v-if="midiMessages.length">
          <tr v-for="message in midiMessages" :key="message.id">
            <td class="midi-learn-view__mono">
              {{ formatValue(message.data) }}
            </td>
            <td class="midi-learn-view__mono">
              CH {{ Number(message.channel) + 1 }}
            </td>
            <td class="midi-learn-view__mono">
              {{ formatType(message.type) }}
            </td>
            <td>{{ message.deviceName }}</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td colspan="4" class="midi-learn-view__empty">
              Waiting for MIDI input.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script>
const MONITOR_POLL_MS = 100;
const ACTIVE_WINDOW_MS = 2000;

export default {
  data() {
    return {
      iVTitle: "MIDI Learn View",
      iVBody:
        "Monitor connected MIDI inputs, inspect recent messages, and arm MIDI learn mode.",
      midiMessages: [],
      monitorInterval: null,
      snapshot: {},
      lastSeenAt: {},
      now: Date.now(),
    };
  },

  computed: {
    devices() {
      return this.$modV.store.state.midi.devices;
    },

    deviceEntries() {
      return Object.entries(this.devices);
    },

    deviceCount() {
      return this.deviceEntries.length;
    },

    learningActive() {
      return !!this.$modV.store.state.midi.learning;
    },

    learnActiveLabel() {
      return "Waiting for the next MIDI message to complete learn mode.";
    },

    learnIdleLabel() {
      return "Arm learn mode, then move a controller to capture the next MIDI message.";
    },
  },

  mounted() {
    this.captureSnapshot();
    this.monitorInterval = setInterval(this.pollMidiData, MONITOR_POLL_MS);
  },

  beforeDestroy() {
    clearInterval(this.monitorInterval);
    this.monitorInterval = null;
  },

  methods: {
    async toggleLearnMode() {
      if (this.learningActive) {
        // Disarm: resolve the pending learn promise with null to cancel
        const resolveFn = this.$modV.store.state.midi.learning;
        if (typeof resolveFn === "function") {
          resolveFn(null);
        }
        return;
      }

      try {
        await this.$modV.store.dispatch("midi/learn");
      } catch (error) {
        console.error(error);
      }
    },

    captureSnapshot() {
      const nextSnapshot = {};
      const deviceEntries = this.deviceEntries;

      for (let i = 0, len = deviceEntries.length; i < len; i++) {
        const deviceId = deviceEntries[i][0];
        const device = deviceEntries[i][1];
        const channelData = device.channelData || {};
        const channels = Object.keys(channelData);

        for (let j = 0, channelLen = channels.length; j < channelLen; j++) {
          const channel = channels[j];
          const channelTypes = channelData[channel] || {};
          const types = Object.keys(channelTypes);

          for (let k = 0, typeLen = types.length; k < typeLen; k++) {
            const type = types[k];

            nextSnapshot[this.snapshotKey(deviceId, channel, type)] =
              channelTypes[type];
          }
        }
      }

      this.snapshot = nextSnapshot;
    },

    pollMidiData() {
      const nextSnapshot = {};
      const deviceEntries = this.deviceEntries;

      for (let i = 0, len = deviceEntries.length; i < len; i++) {
        const deviceId = deviceEntries[i][0];
        const device = deviceEntries[i][1];
        const channelData = device.channelData || {};
        const channels = Object.keys(channelData);

        for (let j = 0, channelLen = channels.length; j < channelLen; j++) {
          const channel = channels[j];
          const channelTypes = channelData[channel] || {};
          const types = Object.keys(channelTypes);

          for (let k = 0, typeLen = types.length; k < typeLen; k++) {
            const type = types[k];
            const key = this.snapshotKey(deviceId, channel, type);
            const value = channelTypes[type];

            nextSnapshot[key] = value;

            if (this.snapshot[key] !== value) {
              this.lastSeenAt = {
                ...this.lastSeenAt,
                [deviceId]: Date.now(),
              };

              this.midiMessages = [
                {
                  id: `${key}-${Date.now()}`,
                  deviceId,
                  deviceName: device.name,
                  channel,
                  type,
                  data: value,
                },
                ...this.midiMessages,
              ].slice(0, 10);
            }
          }
        }
      }

      this.snapshot = nextSnapshot;
      this.now = Date.now();
    },

    snapshotKey(deviceId, channel, type) {
      return `${deviceId}:${channel}:${type}`;
    },

    isDeviceActive(deviceId) {
      const lastSeenAt = this.lastSeenAt[deviceId];

      return !!lastSeenAt && this.now - lastSeenAt < ACTIVE_WINDOW_MS;
    },

    formatType(type) {
      if (Number(type) === 176) {
        return "CC";
      }

      if (Number(type) === 144) {
        return "NOTE";
      }

      return String(type);
    },

    formatValue(value) {
      if (typeof value !== "number") {
        return String(value);
      }

      if (Number.isInteger(value)) {
        return String(value);
      }

      return value.toFixed(3);
    },
  },
};
</script>

<style scoped>
.midi-learn-view {
  padding: 16px;
  background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.05),
      transparent 30%
    ),
    linear-gradient(135deg, rgba(241, 196, 16, 0.08), transparent 35%), #111;
  color: var(--foreground-color);
}

.midi-learn-view__summary {
  margin-bottom: 16px;
}

.midi-learn-view__tile,
.midi-learn-view__refreshNote,
.midi-learn-view__section {
  border: 1px solid var(--foreground-color-3);
  background: rgba(255, 255, 255, 0.03);
}

.midi-learn-view__tile {
  min-height: 72px;
  padding: 12px;
}

.midi-learn-view__tileLabel,
.midi-learn-view__sectionHeader,
.midi-learn-view__toolbarText {
  color: var(--foreground-color-1);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.midi-learn-view__tileValue {
  margin-top: 6px;
  font-size: 22px;
  font-weight: 700;
}

.midi-learn-view__refreshNote {
  display: flex;
  align-items: center;
  min-height: 72px;
  padding: 12px 14px;
}

.midi-learn-view__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.midi-learn-view__learnButton {
  min-width: 180px;
  padding: 14px 18px;
  border: 1px solid var(--focus-color);
  background: linear-gradient(
      135deg,
      rgba(241, 196, 16, 0.2),
      rgba(255, 94, 0, 0.2)
    ),
    #1b1b1b;
  color: var(--foreground-color);
  font-weight: 700;
  letter-spacing: 0.12em;
}

.midi-learn-view__learnButton.active {
  background: linear-gradient(
      135deg,
      rgba(241, 196, 16, 0.85),
      rgba(255, 94, 0, 0.85)
    ),
    #1b1b1b;
  color: #111;
}

.midi-learn-view__section {
  margin-bottom: 16px;
  overflow: hidden;
}

.midi-learn-view__sectionHeader {
  padding: 10px 12px;
  border-bottom: 1px solid var(--foreground-color-3);
  background: rgba(255, 255, 255, 0.04);
}

.midi-learn-view__table {
  width: 100%;
  margin: 0;
  border: 0;
}

.midi-learn-view__table th,
.midi-learn-view__table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--foreground-color-4);
  background: transparent;
}

.midi-learn-view__table th {
  color: var(--foreground-color-1);
}

.midi-learn-view__status {
  display: inline-block;
  min-width: 72px;
  padding: 2px 8px;
  border-radius: 999px;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
}

.midi-learn-view__status-active {
  background: rgba(18, 192, 91, 0.18);
  color: #7dffb1;
}

.midi-learn-view__status-inactive {
  background: rgba(255, 255, 255, 0.08);
  color: var(--foreground-color-1);
}

.midi-learn-view__mono {
  font-family: var(--monoFont);
  font-variant-numeric: tabular-nums;
}

.midi-learn-view__empty {
  color: var(--foreground-color-1);
}

.midi-learn-view-learning .midi-learn-view__tile-learnable,
.midi-learn-view-learning .midi-learn-view__section-learnable {
  border-color: rgba(var(--focus-color-rgb), 0.8);
  box-shadow: inset 0 0 0 1px rgba(var(--focus-color-rgb), 0.35),
    0 0 18px rgba(var(--focus-color-rgb), 0.12);
}

@media only screen and (max-width: 600px) {
  .midi-learn-view {
    padding: 12px;
  }

  .midi-learn-view__toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .midi-learn-view__learnButton {
    width: 100%;
  }

  .midi-learn-view__table th,
  .midi-learn-view__table td {
    padding: 8px;
    font-size: 11px;
  }
}
</style>
