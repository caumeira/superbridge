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
function getIPCChannelName(name) {
  return `SUPERBRIDGE__${name}`;
}
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
const log = createLogger("superbridge/preload");
if (!process.env.SUPERBRIDGE_SCHEMA) {
  throw new Error(
    "Superbridge is not initialized. Make sure to call initializeSuperbridgeMain() in your main process before creating BrowserWindow."
  );
}
const schema = JSON.parse(
  process.env.SUPERBRIDGE_SCHEMA
);
function createSuperbridgeInterface() {
  return {
    send: async (type, payload) => {
      if (!type) throw new Error("Type is required");
      log.debug(`Sending "${type}" with payload`, payload);
      return electron.ipcRenderer.invoke(getIPCChannelName(type), payload);
    },
    handle: (type, handler) => {
      if (!type) throw new Error("Type is required");
      function handleMessage(_event, payload) {
        log.debug(`Handling "${type}" with payload`, payload);
        handler(payload, _event);
      }
      electron.ipcRenderer.on(getIPCChannelName(type), handleMessage);
      return () => {
        electron.ipcRenderer.off(getIPCChannelName(type), handleMessage);
      };
    },
    get schema() {
      return schema;
    },
    get routingId() {
      return electron.webFrame.routingId;
    }
  };
}
function initializeSuperbridgePreload() {
  electron.contextBridge.exposeInMainWorld(
    "$superbridgeinterface",
    createSuperbridgeInterface()
  );
}
export {
  initializeSuperbridgePreload
};
//# sourceMappingURL=index.js.map
