import "../shared/init";
import "../shared/superbridge";

import { IpcMainInvokeEvent, ipcMain, webContents } from "electron";
import {
  PromiseController,
  createControlledPromise,
} from "../utils/controlledPromise";

import { BridgeMessageType } from "../shared/defineMessage";
import { HandleResult } from "../shared/messages";
import { RawBridgeData } from "../shared/types";
import { bridgeSerializer } from "../shared/serializer";
import { createLogger } from "../shared/log";
import { generateId } from "../utils/id";
import { getIPCChannelName } from "../shared/channel";
import { initializeSuperbridge } from "../shared/superbridge";

const log = createLogger("superbridge/main/init");

const pendingRequests = new Map<string, PromiseController<any>>();

ipcMain.handle(
  getIPCChannelName("HANDLE_RESULT"),
  (_event, payload: RawBridgeData) => {
    const result = bridgeSerializer.deserialize<HandleResult<any>>(
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
  send<I, O>(message: BridgeMessageType<I, O>, payload: I, webId?: number) {
    if (webId === undefined) {
      throw new Error("webId is required");
    }

    const requestId = generateId();

    const targetWebContents = webContents.fromId(webId);

    if (!targetWebContents) {
      throw new Error(`Target webContents not found for id: ${webId}`);
    }

    log.debug(`Send "${message.type}" with payload`, payload);

    const [promise, controller] = createControlledPromise<O>();

    pendingRequests.set(requestId, controller);

    targetWebContents.send(getIPCChannelName(message.type), {
      requestId,
      payload: bridgeSerializer.serialize(payload),
    } as RawBridgeData);

    return promise;
  },
  handle<I, O>(
    message: BridgeMessageType<I, O>,
    handler: (payload: I) => Promise<O>
  ) {
    async function handleMessage(
      _event: IpcMainInvokeEvent,
      payload: RawBridgeData
    ) {
      log.debug(`Handling "${message.type}" with payload`, payload);

      const result = await handler(
        bridgeSerializer.deserialize<I>(payload.payload)
      );

      return bridgeSerializer.serialize(result);
    }

    ipcMain.handle(getIPCChannelName(message.type), handleMessage);

    return () => {
      ipcMain.removeHandler(getIPCChannelName(message.type));
    };
  },
});
