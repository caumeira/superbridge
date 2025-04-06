import { BrowserWindow, app } from "electron";

import { $getBody } from "../bridge/message";
import { bridge } from "../../../superbridge/shared/superbridge";
import { bridgeHandler } from "../bridge/handler";
import { initializeSuperbridgeMain } from "superbridge/main";
import path from "path";

// Enable garbage collection exposure for debugging
app.commandLine.appendSwitch("js-flags", "--expose-gc");

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, "../..");
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, "../public");

process.env.SUPERBRIDGE_DEBUG = "true";

let win: BrowserWindow | null = null;
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

function createWindow() {
  initializeSuperbridgeMain(bridgeHandler);

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", async () => {
    const body = await bridge.send($getBody, undefined, win?.webContents.id);
    console.log("body", body);
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST as string, "index.html"));
  }
}

app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.whenReady().then(createWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
