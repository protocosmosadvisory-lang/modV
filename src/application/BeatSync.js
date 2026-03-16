const BEAT_POLL_INTERVAL_MS = 1000 / 60;
const SYNC_WINDOW_MS = 50;

class BeatSync {
  constructor() {
    this.listeners = {};
    this.queue = [];
    this.lastKickState = false;
    this.lastBeatAt = 0;
    this.pollInterval = null;

    this.startPolling();
  }

  startPolling() {
    if (this.pollInterval) {
      return;
    }

    this.pollInterval = setInterval(() => {
      const modV = typeof window !== "undefined" ? window.modV : null;
      const kick = Boolean(modV?.store?.state?.beats?.kick);

      if (kick && !this.lastKickState) {
        this.handleBeat();
      }

      this.lastKickState = kick;
    }, BEAT_POLL_INTERVAL_MS);
  }

  handleBeat() {
    this.lastBeatAt = Date.now();
    this.emit("beat", { timestamp: this.lastBeatAt });

    const queued = this.queue.slice();
    this.queue = [];

    for (let i = 0; i < queued.length; i += 1) {
      queued[i].resolve({
        deck: queued[i].deck,
        row: queued[i].row,
        col: queued[i].col,
        timestamp: this.lastBeatAt,
      });
    }
  }

  queueTrigger(deck, row, col) {
    if (Date.now() - this.lastBeatAt <= SYNC_WINDOW_MS) {
      return Promise.resolve({
        deck,
        row,
        col,
        timestamp: this.lastBeatAt,
      });
    }

    return new Promise((resolve) => {
      this.queue.push({
        deck,
        row,
        col,
        resolve,
      });
    });
  }

  on(eventName, listener) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }

    this.listeners[eventName].push(listener);

    return () => this.off(eventName, listener);
  }

  off(eventName, listener) {
    if (!this.listeners[eventName]) {
      return;
    }

    this.listeners[eventName] = this.listeners[eventName].filter(
      (entry) => entry !== listener
    );
  }

  emit(eventName, payload) {
    const listeners = this.listeners[eventName] || [];

    for (let i = 0; i < listeners.length; i += 1) {
      listeners[i](payload);
    }
  }
}

export default new BeatSync();
