import { CustomTransfomer } from "./types";
import { createLogger } from "../log";
import { defineBridgeMessage } from "../defineMessage";
import { generateId } from "../../utils/id";
import { once } from "../../utils/once";

const log = createLogger("superbridge/callbacks");

const callbacks = new Map<string, Function>();

setInterval(() => {
  console.log("callbacks", callbacks.size);
}, 1000);

export const $removeRemoteCallback = defineBridgeMessage<{
  callbackId: string;
}>("$removeRemoteCallback");

export const $triggerRemoteCallback = defineBridgeMessage<
  {
    callbackId: string;
    args: unknown[];
  },
  unknown
>("$triggerRemoteCallback");

function getCallbackId(callback: Function) {
  let id = `$$callback-${generateId()}`;

  if (typeof window !== "undefined") {
    id = `${id}-${window.$superbridge.routingId}`;
  }

  return id;
}

/**
 * $$callback-123-456
 */
function getCallbackRoutingId(callbackId: string) {
  const [_callbackLabel, _callbackId, routingId] = callbackId.split("-");

  if (!routingId) return null;

  return parseInt(routingId, 10);
}

export function registerCallback(callback: Function) {
  initializeRemoteCallbacks();

  const id = getCallbackId(callback);

  callbacks.set(id, callback);

  return id;
}

export const initializeRemoteCallbacks = once(() => {
  // Shared between renderer and main
  $removeRemoteCallback.handle(async ({ callbackId }) => {
    log.debug(`Handling remove remote callback "${callbackId}"`);
    callbacks.delete(callbackId);
  });

  $triggerRemoteCallback.handle(async ({ callbackId, args }) => {
    log.debug(
      `Handling trigger remote callback "${callbackId}" with callId`,
      args
    );
    const callback = callbacks.get(callbackId);

    if (!callback) {
      throw new Error(`Callback "${callbackId}" not found`);
    }

    return await callback(...args);
  });
});

const callbackFinalizationRegistry = new FinalizationRegistry<string>(
  (remoteCallbackId) => {
    $removeRemoteCallback.send(
      { callbackId: remoteCallbackId },
      getCallbackRoutingId(remoteCallbackId) ?? undefined
    );
  }
);

function deserializeCallbackId(callbackId: string) {
  async function remoteCallbackInvoker(...args: unknown[]) {
    log.debug(`Invoking remote callback "${callbackId}" with args`, args);

    return await $triggerRemoteCallback.send(
      {
        callbackId: callbackId,
        args,
      },
      getCallbackRoutingId(callbackId) ?? undefined
    );
  }

  callbackFinalizationRegistry.register(remoteCallbackInvoker, callbackId);

  return remoteCallbackInvoker;
}

export const callbackSerializer: CustomTransfomer<Function, string> = {
  isApplicable: (value): value is Function => typeof value === "function",
  serialize: (callback: Function) => registerCallback(callback),
  deserialize: deserializeCallbackId,
};
