import {
  IpcRendererEvent,
  contextBridge,
  ipcRenderer,
  webFrame,
} from "electron";

import { type BridgeHandlerSchema } from "../main/schema";
import { getIPCChannelName } from "../shared/channel";
import { createLogger } from "../shared/log";
import { RawBridgeData } from "../shared/types";
import SuperJSON from "superjson";

const log = createLogger("superbridge/preload");

/**
 * ! deserialization CANNOT happen here!
 *
 * This is because there is no way to share memory between preload and renderer (tried hard)
 *
 */

if (!process.env.SUPERBRIDGE_SCHEMA) {
  throw new Error(
    "Superbridge is not initialized. Make sure to call initializeSuperbridgeMain() in your main process before creating BrowserWindow."
  );
}

const schema = SuperJSON.parse(
  process.env.SUPERBRIDGE_SCHEMA
) as BridgeHandlerSchema;

function createSuperbridgeInterface() {
  return {
    send: async (type: string, payload: RawBridgeData) => {
      if (!type) throw new Error("Type is required");

      log.debug(`Sending "${type}" with payload`, payload);

      return ipcRenderer.invoke(getIPCChannelName(type), payload);
    },
    handle: (
      type: string,
      handler: (payload: RawBridgeData, event: IpcRendererEvent) => void
    ) => {
      if (!type) throw new Error("Type is required");

      function handleMessage(
        _event: Electron.IpcRendererEvent,
        payload: RawBridgeData
      ) {
        log.debug(`Handling "${type}" with payload`, payload);
        handler(payload, _event);
      }

      ipcRenderer.on(getIPCChannelName(type), handleMessage);

      return () => {
        ipcRenderer.off(getIPCChannelName(type), handleMessage);
      };
    },
    get schema() {
      return schema;
    },
    get routingId() {
      return webFrame.routingId;
    },
  };
}

export type SuperBridgeInterface = ReturnType<
  typeof createSuperbridgeInterface
>;

export function initializeSuperbridgePreload() {
  contextBridge.exposeInMainWorld(
    "$superbridgeinterface",
    createSuperbridgeInterface()
  );
}

declare global {
  interface Window {
    $superbridgeinterface: SuperBridgeInterface;
  }
}
