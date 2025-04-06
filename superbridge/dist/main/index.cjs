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
const log$2 = createLogger("superbridge/callbacks");
const callbacks = /* @__PURE__ */ new Map();
const $removeRemoteCallback = defineBridgeMessage("$removeRemoteCallback");
const $triggerRemoteCallback = defineBridgeMessage("$triggerRemoteCallback");
bridge.handle($removeRemoteCallback, async ({ callbackId }) => {
  log$2.debug(`Handling remove remote callback "${callbackId}"`);
  callbacks.delete(callbackId);
});
bridge.handle($triggerRemoteCallback, async ({ callbackId, args }) => {
  log$2.debug(
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
    log$2.debug(`Invoking remote callback "${callbackId}" with args`, args);
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
function getAugmentedNamespace(n) {
  if (n.__esModule) return n;
  var f = n.default;
  if (typeof f == "function") {
    var a = function a2() {
      if (this instanceof a2) {
        return Reflect.construct(f, arguments, this.constructor);
      }
      return f.apply(this, arguments);
    };
    a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, "__esModule", { value: true });
  Object.keys(n).forEach(function(k) {
    var d = Object.getOwnPropertyDescriptor(n, k);
    Object.defineProperty(a, k, d.get ? d : {
      enumerable: true,
      get: function() {
        return n[k];
      }
    });
  });
  return a;
}
const __viteBrowserExternal = {};
const __viteBrowserExternal$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: __viteBrowserExternal
}, Symbol.toStringTag, { value: "Module" }));
const require$$1 = /* @__PURE__ */ getAugmentedNamespace(__viteBrowserExternal$1);
const fs = require$$1;
const path = require$$1;
const pathFile = path.join(__dirname, "path.txt");
function getElectronPath() {
  let executablePath;
  if (fs.existsSync(pathFile)) {
    executablePath = fs.readFileSync(pathFile, "utf-8");
  }
  if (process.env.ELECTRON_OVERRIDE_DIST_PATH) {
    return path.join(process.env.ELECTRON_OVERRIDE_DIST_PATH, executablePath || "electron");
  }
  if (executablePath) {
    return path.join(__dirname, "dist", executablePath);
  } else {
    throw new Error("Electron failed to install correctly, please delete node_modules/electron and try installing again");
  }
}
var electron = getElectronPath();
function createControlledPromise() {
  let controller;
  const promise = new Promise((_resolve, _reject) => {
    controller = {
      resolve: _resolve,
      reject: _reject
    };
  });
  return [promise, controller];
}
function getIPCChannelName(name) {
  return `SUPERBRIDGE__${name}`;
}
const log$1 = createLogger("superbridge/main/init");
const pendingRequests = /* @__PURE__ */ new Map();
electron.ipcMain.handle(
  getIPCChannelName("HANDLE_RESULT"),
  (_event, payload) => {
    const result = bridgeSerializer.deserialize(
      payload.payload
    );
    const pendingRequestController = pendingRequests.get(result.requestId);
    if (!pendingRequestController) {
      throw new Error(`No controller found for requestId: ${result.requestId}`);
    }
    pendingRequests.delete(result.requestId);
    if (result.type === "success") {
      pendingRequestController.resolve(result.result);
    } else {
      pendingRequestController.reject(result.error);
    }
  }
);
initializeSuperbridge({
  send(message, payload, webId) {
    if (webId === void 0) {
      throw new Error("webId is required");
    }
    const requestId = generateId();
    const targetWebContents = electron.webContents.fromId(webId);
    if (!targetWebContents) {
      throw new Error(`Target webContents not found for id: ${webId}`);
    }
    log$1.debug(`Send "${message.type}" with payload`, payload);
    const [promise, controller] = createControlledPromise();
    pendingRequests.set(requestId, controller);
    targetWebContents.send(getIPCChannelName(message.type), {
      requestId,
      payload: bridgeSerializer.serialize(payload)
    });
    return promise;
  },
  handle(message, handler) {
    async function handleMessage(_event, payload) {
      log$1.debug(`Handling "${message.type}" with payload`, payload);
      const result = await handler(
        bridgeSerializer.deserialize(payload.payload)
      );
      return bridgeSerializer.serialize(result);
    }
    electron.ipcMain.handle(getIPCChannelName(message.type), handleMessage);
    return () => {
      electron.ipcMain.removeHandler(getIPCChannelName(message.type));
    };
  }
});
const $execute = defineBridgeMessage(
  "$execute"
);
const $reset = defineBridgeMessage("$reset");
const log = createLogger("superbridge/main/init");
function initializeSuperbridgeMain(handler) {
  log.debug("Initialize Superbridge Main");
  process.env.SUPERBRIDGE_SCHEMA = JSON.stringify(handler.schema);
  bridge.handle($execute, async (payload) => {
    log.debug(`Handling execute "${payload.path}" with args`, payload.args);
    return handler.execute(payload.path, payload.args);
  });
  bridge.handle($reset, async () => {
    log.debug("Handling reset");
    await handler.reset();
  });
}
const QUERY_SYMBOL = Symbol("query");
function getIsQuery(value) {
  return typeof value === "function" && QUERY_SYMBOL in value && value[QUERY_SYMBOL] === "query";
}
function query(handler) {
  const queryFunction = async (...args) => {
    return handler(...args);
  };
  queryFunction[QUERY_SYMBOL] = "query";
  return queryFunction;
}
const EFFECT_SYMBOL = Symbol("effect");
function getIsEffect(value) {
  return typeof value === "function" && EFFECT_SYMBOL in value && value[EFFECT_SYMBOL] === "effect";
}
function effect(handler) {
  const effectFunction = async (...args) => {
    return handler(...args);
  };
  effectFunction[EFFECT_SYMBOL] = "effect";
  return effectFunction;
}
const MUTATION_SYMBOL = Symbol("mutation");
function getIsMutation(value) {
  return typeof value === "function" && MUTATION_SYMBOL in value && value[MUTATION_SYMBOL] === "mutation";
}
function mutation(handler) {
  const mutationFunction = async (...args) => {
    return handler(...args);
  };
  mutationFunction[MUTATION_SYMBOL] = "mutation";
  return mutationFunction;
}
function getIsPlainObject(value) {
  return (value == null ? void 0 : value.constructor) === Object;
}
function getPath(currentPath, key) {
  if (!currentPath) return key;
  return `${currentPath}.${key}`;
}
function buildPropertiesMap(currentPath, result, input) {
  for (const [key, value] of Object.entries(input)) {
    const path2 = getPath(currentPath, key);
    if (getIsPlainObject(value)) {
      buildPropertiesMap(path2, result, value);
    } else {
      result.set(path2, value);
    }
  }
}
function createNestedRecordPropertiesMap(input) {
  const map = /* @__PURE__ */ new Map();
  buildPropertiesMap("", map, input);
  return map;
}
function getBridgeHandlerSchema(input) {
  const map = createNestedRecordPropertiesMap(input);
  const schema = {};
  for (const [key, value] of map.entries()) {
    if (getIsQuery(value)) {
      schema[key] = {
        type: "query"
      };
      continue;
    }
    if (getIsMutation(value)) {
      schema[key] = {
        type: "mutation"
      };
      continue;
    }
    if (getIsEffect(value)) {
      schema[key] = {
        type: "effect"
      };
      continue;
    }
    if (typeof value === "function") {
      schema[key] = {
        type: "query"
      };
      continue;
    }
    console.warn(`Unknown field type: ${key}`, value);
  }
  return schema;
}
createLogger("superbridge/main/BridgeHandler");
class BridgeHandler {
  constructor(input) {
    this.input = input;
    this.handlersMap = /* @__PURE__ */ new Map();
    this.pendingMutations = /* @__PURE__ */ new Set();
    this.runningEffects = /* @__PURE__ */ new Set();
    this.handlersMap = createNestedRecordPropertiesMap(input);
    this.schema = getBridgeHandlerSchema(input);
  }
  async waitForPendingMutations() {
    while (this.pendingMutations.size) {
      const promises = [...this.pendingMutations];
      for (const promise of promises) {
        try {
          await promise;
        } catch {
        }
      }
    }
  }
  addPendingMutation(promise) {
    this.pendingMutations.add(promise);
    promise.finally(() => {
      this.pendingMutations.delete(promise);
    });
  }
  getHandler(path2) {
    const handler = this.handlersMap.get(path2);
    if (!handler) {
      throw new Error(`Handler not found for path: ${path2}`);
    }
    return handler;
  }
  async execute(path2, args) {
    const handler = this.getHandler(path2);
    if (getIsMutation(handler)) {
      const promise = handler(...args);
      this.addPendingMutation(promise);
      return promise;
    }
    if (getIsEffect(handler)) {
      const cleanup = handler(...args);
      this.runningEffects.add(cleanup);
      return cleanup;
    }
    return handler(...args);
  }
  async cleanAllEffects() {
    const effects = [...this.runningEffects];
    for (const effect2 of effects) {
      try {
        const cleanup = await effect2;
        if (typeof cleanup === "function") {
          cleanup();
        }
      } catch {
      }
    }
    this.runningEffects.clear();
  }
  async reset() {
    await this.cleanAllEffects();
    await this.waitForPendingMutations();
  }
}
function createBridgeHandler(input) {
  return new BridgeHandler(input);
}
exports.createBridgeHandler = createBridgeHandler;
exports.effect = effect;
exports.getIsEffect = getIsEffect;
exports.getIsMutation = getIsMutation;
exports.getIsQuery = getIsQuery;
exports.initializeSuperbridgeMain = initializeSuperbridgeMain;
exports.mutation = mutation;
exports.query = query;
//# sourceMappingURL=index.cjs.map
