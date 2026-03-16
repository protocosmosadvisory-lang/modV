import clipLauncher from "../media-manager/ClipLauncher";
import store from "../ui-store";

const POLL_MS = 100;
const NOTE_ON_STATUS_MIN = 144;
const NOTE_ON_STATUS_MAX = 159;

function createBindingKey(deviceId, channel, note) {
  return `${deviceId}:${channel}:${note}`;
}

class MidiBindingService {
  constructor() {
    this.pollInterval = null;
    this.learnMode = false;
    this.learnRequest = null;
    this.lastActiveNotes = {};
  }

  startListening() {
    if (this.pollInterval) {
      return;
    }

    this.pollInterval = setInterval(() => {
      this.pollDevices();
    }, POLL_MS);
  }

  stopListening() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.lastActiveNotes = {};
    this.cancelLearn();
  }

  startLearn() {
    this.cancelLearn();
    this.learnMode = true;

    return new Promise((resolve, reject) => {
      this.learnRequest = { resolve, reject };
    });
  }

  cancelLearn() {
    if (this.learnRequest?.reject) {
      this.learnRequest.reject(new Error("MIDI learn cancelled"));
    }

    this.learnRequest = null;
    this.learnMode = false;
  }

  pollDevices() {
    const devices = window.modV?.store?.state?.midi?.devices || {};
    const activeNotes = {};
    const deviceIds = Object.keys(devices);

    for (let i = 0, len = deviceIds.length; i < len; i++) {
      const deviceId = deviceIds[i];
      const device = devices[deviceId];

      if (!device?.listenForInput) {
        continue;
      }

      const messages = this.getNoteOnMessages(
        deviceId,
        device.channelData || {}
      );

      for (let j = 0, msgLen = messages.length; j < msgLen; j++) {
        const message = messages[j];
        const key = createBindingKey(
          message.deviceId,
          message.channel,
          message.note
        );

        activeNotes[key] = true;

        if (this.lastActiveNotes[key]) {
          continue;
        }

        if (this.learnMode && this.learnRequest?.resolve) {
          this.learnRequest.resolve({
            deviceId: message.deviceId,
            channel: message.channel,
            note: message.note,
          });
          this.learnRequest = null;
          this.learnMode = false;
          continue;
        }

        const binding = store.state["midi-bindings"]?.bindings?.[key];

        if (binding) {
          clipLauncher.triggerClip(binding.deck, binding.row, binding.col);
        }
      }
    }

    this.lastActiveNotes = activeNotes;
  }

  getNoteOnMessages(deviceId, channelData) {
    const messages = [];
    const channelKeys = Object.keys(channelData);

    for (let i = 0, len = channelKeys.length; i < len; i++) {
      const channelKey = channelKeys[i];
      const entry = channelData[channelKey] || {};

      if (Array.isArray(entry.noteOn)) {
        const [note, velocity] = entry.noteOn;

        if (Number(velocity) > 0) {
          messages.push({
            deviceId,
            channel: Number(channelKey),
            note: Number(note),
          });
        }
      }

      const statusKeys = Object.keys(entry);
      for (let j = 0, statusLen = statusKeys.length; j < statusLen; j++) {
        const statusKey = statusKeys[j];
        const status = Number(statusKey);
        const value = Number(entry[statusKey]);

        if (
          status >= NOTE_ON_STATUS_MIN &&
          status <= NOTE_ON_STATUS_MAX &&
          value > 0
        ) {
          messages.push({
            deviceId,
            channel: status - NOTE_ON_STATUS_MIN,
            note: Number(channelKey),
          });
        }
      }
    }

    return messages;
  }
}

export default new MidiBindingService();
