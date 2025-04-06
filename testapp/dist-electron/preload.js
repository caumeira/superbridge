'use strict';

const electron = require('electron');

function n(e) {
  return `SUPERBRIDGE__${e}`;
}

function c$1(s) {
  const e = "color: #808080;", n = `%c🌉 ${s}:%c`, r = (...o) => {
    console.info(n, e, "", ...o);
  };
  return r.debug = (...o) => {
    console.debug(n, e, "", ...o);
  }, r.warn = (...o) => {
    console.warn(n, e, "", ...o);
  }, r.error = (...o) => {
    console.error(n, e, "", ...o);
  }, r.rename = (o) => c$1(o), r;
}
c$1("superbridge");

const a = c$1("superbridge/preload");
if (!process.env.SUPERBRIDGE_SCHEMA)
  throw new Error(
    "Superbridge is not initialized. Make sure to call initializeSuperbridgeMain() in your main process before creating BrowserWindow."
  );
const c = JSON.parse(
  process.env.SUPERBRIDGE_SCHEMA
);
function f() {
  return {
    send: async (e, r) => {
      if (!e) throw new Error("Type is required");
      return a.debug(`Sending "${e}" with payload`, r), electron.ipcRenderer.invoke(n(e), r);
    },
    handle: (e, r) => {
      if (!e) throw new Error("Type is required");
      function o(s, t) {
        a.debug(`Handling "${e}" with payload`, t), r(t, s);
      }
      return electron.ipcRenderer.on(n(e), o), () => {
        electron.ipcRenderer.off(n(e), o);
      };
    },
    get schema() {
      return c;
    },
    get routingId() {
      return electron.webFrame.routingId;
    }
  };
}
function w() {
  electron.contextBridge.exposeInMainWorld(
    "$superbridgeinterface",
    f()
  );
}

w();
//# sourceMappingURL=preload.js.map
