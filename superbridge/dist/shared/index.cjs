"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
class BridgeMessageType {
  constructor(type) {
    this.type = type;
  }
}
function defineBridgeMessage(name) {
  return new BridgeMessageType(name);
}
const NO_VALUE = Symbol("NO_VALUE");
class Signal {
  constructor() {
    this.listeners = /* @__PURE__ */ new Map();
    this.lastValue = NO_VALUE;
  }
  assertLastValue(error) {
    if (this.lastValue === NO_VALUE) {
      throw typeof error === "string" ? new Error(error) : error;
    }
    return this.lastValue;
  }
  get hasLastValue() {
    return this.lastValue !== NO_VALUE;
  }
  get maybeLastValue() {
    return this.lastValue === NO_VALUE ? void 0 : this.lastValue;
  }
  emit(value) {
    this.lastValue = value;
    const listeners = [...this.listeners.values()];
    for (const listener of listeners) {
      try {
        listener(value);
      } catch (error) {
        console.error(error);
      }
    }
  }
  subscribe(listener) {
    const id = Symbol();
    this.listeners.set(id, listener);
    return () => {
      this.listeners.delete(id);
    };
  }
  subscribeWithCurrentValue(listener) {
    if (this.lastValue !== NO_VALUE) {
      listener(this.lastValue);
    }
    return this.subscribe(listener);
  }
  effect(initializer) {
    let currentCleanup;
    const cancelSubscription = this.subscribeWithCurrentValue((value) => {
      if (currentCleanup) {
        currentCleanup();
      }
      currentCleanup = initializer(value);
    });
    return () => {
      cancelSubscription();
      if (currentCleanup) {
        currentCleanup();
      }
    };
  }
}
const currentSuperbridgeChannel = new Signal();
const bridge = {
  send(message, payload, webId) {
    const link = currentSuperbridgeChannel.assertLastValue(
      "Superbridge is not initialized"
    );
    return link.send(message, payload, webId);
  },
  handle(message, handler) {
    if (!currentSuperbridgeChannel.hasLastValue) {
      Promise.resolve().then(() => {
        if (!currentSuperbridgeChannel.hasLastValue) {
          console.warn("Superbridge is not initialized");
        }
      });
    }
    return currentSuperbridgeChannel.effect((currentBridge) => {
      return currentBridge.handle(message, handler);
    });
  }
};
exports.bridge = bridge;
exports.defineBridgeMessage = defineBridgeMessage;
//# sourceMappingURL=index.cjs.map
