import { $execute, $reset, HandleResult } from "../shared/messages";
import { BridgeHandler, BridgeHandlerInput } from "./BridgeHandler";
import {
  BrowserWindow,
  IpcMainInvokeEvent,
  WebContents,
  ipcMain,
  webContents,
} from "electron";
import { MessageHandler, setMessagesHandler } from "../shared/messagesHandler";
import {
  PromiseController,
  createControlledPromise,
} from "../utils/controlledPromise";

import { RawBridgeData } from "../shared/types";
import { bridgeSerializer } from "../shared/serializer";
import { createLogger } from "../shared/log";
import { generateId } from "../utils/id";
import { getIPCChannelName } from "../shared/channel";
import { initializeShared } from "../shared/init";

const log = createLogger("superbridge/main/init");

const pendingRequests = new Map<string, PromiseController<any>>();

function initializeSuperbridgeMainMessageHandler() {
  log.debug("Initialize Superbridge Main Message Handler");

  ipcMain.handle(
    getIPCChannelName("HANDLE_RESULT"),
    (_event, payload: RawBridgeData) => {
      const result = bridgeSerializer.deserialize<HandleResult<any>>(
        payload.payload
      );

      const pendingRequestController = pendingRequests.get(result.requestId);

      if (!pendingRequestController) {
        throw new Error(
          `No controller found for requestId: ${result.requestId}`
        );
      }

      pendingRequests.delete(result.requestId);

      if (result.type === "success") {
        pendingRequestController.resolve(result.result);
      } else {
        pendingRequestController.reject(result.error);
      }
    }
  );

  setMessagesHandler({
    async send<I, O>(type: string, payload: I, webId: number) {
      if (webId === undefined) {
        throw new Error("webId is required");
      }

      const requestId = generateId();

      const targetWebContents = webContents.fromId(webId);

      if (!targetWebContents) {
        throw new Error(`Target webContents not found for id: ${webId}`);
      }

      log.debug(`Send "${type}" with payload`, payload);

      const [promise, controller] = createControlledPromise<O>();

      pendingRequests.set(requestId, controller);

      targetWebContents.send(getIPCChannelName(type), {
        webId: targetWebContents.id,
        requestId,
        payload: bridgeSerializer.serialize(payload),
      } as RawBridgeData);

      return promise;
    },
    handle<I, O>(type: string, handler: MessageHandler<I, O>) {
      async function handleMessage(
        _event: IpcMainInvokeEvent,
        payload: RawBridgeData
      ) {
        log.debug(`Handling "${type}" with payload`, payload);

        const rawResult = await handler(
          bridgeSerializer.deserialize<I>(payload.payload),
          _event
        );

        return bridgeSerializer.serialize(rawResult);
      }

      ipcMain.handle(getIPCChannelName(type), handleMessage);

      return () => {
        ipcMain.removeHandler(getIPCChannelName(type));
      };
    },
  });
}

export function initializeSuperbridgeMain<T extends BridgeHandlerInput>(
  handler: BridgeHandler<T>
) {
  log.debug("Initialize Superbridge Main");

  initializeSuperbridgeMainMessageHandler();
  initializeShared();

  process.env.SUPERBRIDGE_SCHEMA = JSON.stringify(handler.schema);

  $execute.handle(async (payload) => {
    log.debug(`Handling execute "${payload.path}" with args`, payload.args);
    return handler.execute(payload.path, payload.args);
  });

  $reset.handle(async () => {
    log.debug("Handling reset");
    await handler.reset();
  });
}
