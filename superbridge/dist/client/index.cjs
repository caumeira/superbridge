"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const SuperJSON = require("superjson");
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
function initializeSuperbridge(superbridge) {
  currentSuperbridgeChannel.emit(superbridge);
}
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
class BridgeMessageType {
  constructor(type) {
    this.type = type;
  }
}
function defineBridgeMessage(name) {
  return new BridgeMessageType(name);
}
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function generateId(length = 12) {
  let id = "";
  for (let i = 0; i < length; i++) {
    id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return id;
}
const signalRemoteController = /* @__PURE__ */ new Map();
const $abortRemoteSignal = defineBridgeMessage("$abortRemoteSignal");
function registerSignal(localSignal) {
  const id = `$$signal-${generateId()}`;
  const remoteController = new AbortController();
  signalRemoteController.set(id, remoteController);
  localSignal.addEventListener("abort", () => {
    bridge.send($abortRemoteSignal, { signalId: id });
    signalRemoteController.delete(id);
  });
  signalFinalizationRegistry.register(localSignal, id);
  return id;
}
bridge.handle($abortRemoteSignal, async ({ signalId }) => {
  const controller = signalRemoteController.get(signalId);
  if (!controller) return;
  controller.abort();
  signalRemoteController.delete(signalId);
});
const signalFinalizationRegistry = new FinalizationRegistry(
  (remoteSignalId) => {
    const controller = signalRemoteController.get(remoteSignalId);
    if (!controller) return;
    controller.abort();
    signalRemoteController.delete(remoteSignalId);
  }
);
function deserializeSignalId(signalId) {
  const controller = new AbortController();
  signalRemoteController.set(signalId, controller);
  return controller.signal;
}
const abortSignalSerializer = {
  isApplicable: (value) => value instanceof AbortSignal,
  serialize: (signal) => registerSignal(signal),
  deserialize: (signalId) => deserializeSignalId(signalId)
};
function createLogger(name) {
  const LOG_COLOR = "#808080";
  const LOG_STYLE = `color: ${LOG_COLOR};`;
  const LABEL = `%c🌉 ${name}:%c`;
  const log2 = (...args) => {
    console.info(LABEL, LOG_STYLE, "", ...args);
  };
  log2.debug = (...args) => {
    console.debug(LABEL, LOG_STYLE, "", ...args);
  };
  log2.warn = (...args) => {
    console.warn(LABEL, LOG_STYLE, "", ...args);
  };
  log2.error = (...args) => {
    console.error(LABEL, LOG_STYLE, "", ...args);
  };
  log2.rename = (name2) => {
    return createLogger(name2);
  };
  return log2;
}
createLogger("superbridge");
const log$1 = createLogger("superbridge/callbacks");
const callbacks = /* @__PURE__ */ new Map();
const $removeRemoteCallback = defineBridgeMessage("$removeRemoteCallback");
const $triggerRemoteCallback = defineBridgeMessage("$triggerRemoteCallback");
bridge.handle($removeRemoteCallback, async ({ callbackId }) => {
  log$1.debug(`Handling remove remote callback "${callbackId}"`);
  callbacks.delete(callbackId);
});
bridge.handle($triggerRemoteCallback, async ({ callbackId, args }) => {
  log$1.debug(
    `Handling trigger remote callback "${callbackId}" with callId`,
    args
  );
  const callback = callbacks.get(callbackId);
  if (!callback) {
    throw new Error(`Callback "${callbackId}" not found`);
  }
  return await callback(...args);
});
function getCallbackId() {
  let id = `$$callback-${generateId()}`;
  if (typeof window !== "undefined") {
    id = `${id}-${window.$superbridgeinterface.routingId}`;
  }
  return id;
}
function getCallbackRoutingId(callbackId) {
  const [_callbackLabel, _callbackId, routingId] = callbackId.split("-");
  if (!routingId) return null;
  return parseInt(routingId, 10);
}
function registerCallback(callback) {
  const id = getCallbackId();
  callbacks.set(id, callback);
  return id;
}
const callbackFinalizationRegistry = new FinalizationRegistry(
  (remoteCallbackId) => {
    bridge.send(
      $removeRemoteCallback,
      { callbackId: remoteCallbackId },
      getCallbackRoutingId(remoteCallbackId) ?? void 0
    );
  }
);
function deserializeCallbackId(callbackId) {
  async function remoteCallbackInvoker(...args) {
    log$1.debug(`Invoking remote callback "${callbackId}" with args`, args);
    return await bridge.send(
      $triggerRemoteCallback,
      {
        callbackId,
        args
      },
      getCallbackRoutingId(callbackId) ?? void 0
    );
  }
  callbackFinalizationRegistry.register(remoteCallbackInvoker, callbackId);
  return remoteCallbackInvoker;
}
const callbackSerializer = {
  isApplicable: (value) => typeof value === "function",
  serialize: (callback) => registerCallback(callback),
  deserialize: deserializeCallbackId
};
const bridgeSerializer = new SuperJSON();
bridgeSerializer.registerCustom(callbackSerializer, "superbridge-callback");
bridgeSerializer.registerCustom(
  abortSignalSerializer,
  "superbridge-abortSignal"
);
const { $superbridgeinterface } = window;
initializeSuperbridge({
  async send(message, payload, webId) {
    if (webId !== void 0) {
      console.warn(
        "Sending message to specific webContents is not supported in the client"
      );
      webId = void 0;
    }
    const requestId = generateId();
    const result = await $superbridgeinterface.send(message.type, {
      requestId,
      payload: bridgeSerializer.serialize(payload)
    });
    return bridgeSerializer.deserialize(result);
  },
  handle(message, handler) {
    return $superbridgeinterface.handle(
      message.type,
      async ({ requestId, payload }) => {
        try {
          const result = await handler(
            bridgeSerializer.deserialize(payload)
          );
          await $superbridgeinterface.send("HANDLE_RESULT", {
            requestId,
            payload: bridgeSerializer.serialize({
              requestId,
              type: "success",
              result
            })
          });
        } catch (error) {
          await $superbridgeinterface.send("HANDLE_RESULT", {
            requestId,
            payload: bridgeSerializer.serialize({
              requestId,
              type: "error",
              error
            })
          });
        }
      }
    );
  }
});
const $execute = defineBridgeMessage(
  "$execute"
);
const $reset = defineBridgeMessage("$reset");
function unwrapNestedRecord(pathMap) {
  const result = {};
  const entries = pathMap instanceof Map ? Array.from(pathMap.entries()) : Object.entries(pathMap);
  for (const [path, value] of entries) {
    if (!path) continue;
    const keys = path.split(".");
    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      if (typeof current[key] !== "object" || current[key] === null) {
        current[key] = {};
      }
      current = current[key];
    }
    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
  }
  return result;
}
const CLIENT_SYMBOL = Symbol("superbridge-client");
const log = createLogger("superbridge/client");
function createQueryClient(path) {
  return async function query(...args) {
    log.debug(`Query "${path}" with args`, args);
    await resetPromise;
    return bridge.send($execute, {
      id: generateId(),
      path,
      args
    });
  };
}
function createMutationClient(path) {
  return async function mutation(...args) {
    log.debug(`Mutation "${path}" with args`, args);
    await resetPromise;
    return bridge.send($execute, {
      id: generateId(),
      path,
      args
    });
  };
}
function createEffectClient(path) {
  return function effect(...args) {
    log.debug(`Effect "${path}" with args`, args);
    const maybeCleanupPromise = resetPromise.then(
      () => bridge.send($execute, {
        id: generateId(),
        path,
        args
      })
    );
    return async function cleanup() {
      try {
        const cleanup2 = await maybeCleanupPromise;
        if (typeof cleanup2 === "function") {
          cleanup2();
        }
      } catch (error) {
        console.error(error);
      }
    };
  };
}
let resetPromise;
function createSuperbridgeClient() {
  resetPromise = bridge.send($reset, void 0);
  const schema = window.$superbridgeinterface.schema;
  if (!schema) {
    throw new Error("Schema is not initialized");
  }
  const flatClient = {};
  for (const [path, fieldSchema] of Object.entries(schema)) {
    if (fieldSchema.type === "query") {
      flatClient[path] = createQueryClient(path);
    }
    if (fieldSchema.type === "mutation") {
      flatClient[path] = createMutationClient(path);
    }
    if (fieldSchema.type === "effect") {
      flatClient[path] = createEffectClient(path);
    }
  }
  const client = unwrapNestedRecord(flatClient);
  Reflect.set(client, CLIENT_SYMBOL, true);
  return client;
}
exports.createSuperbridgeClient = createSuperbridgeClient;
//# sourceMappingURL=index.cjs.map
