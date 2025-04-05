'use strict';

const electron = require('electron');

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
  electron.contextBridge.exposeInMainWorld("$superbridge", createSuperbridgeInterface());
}

initializeSuperbridgePreload();
//# sourceMappingURL=preload.js.map
