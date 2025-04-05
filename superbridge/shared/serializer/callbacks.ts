import { CustomTransfomer } from "./types";
import { bridge } from "../superbridge";
import { createLogger } from "../log";
import { defineBridgeMessage } from "../defineMessage";
import { generateId } from "../../utils/id";

const log = createLogger("superbridge/callbacks");

const callbacks = new Map<string, Function>();

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

bridge.handle($removeRemoteCallback, async ({ callbackId }) => {
  log.debug(`Handling remove remote callback "${callbackId}"`);
  callbacks.delete(callbackId);
});

bridge.handle($triggerRemoteCallback, async ({ callbackId, args }) => {
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

setInterval(() => {
  console.log("callbacks", callbacks.size);
}, 1000);

function getCallbackId() {
  let id = `$$callback-${generateId()}`;

  if (typeof window !== "undefined") {
    id = `${id}-${window.$superbridgelink.routingId}`;
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
  const id = getCallbackId();

  callbacks.set(id, callback);

  return id;
}

const callbackFinalizationRegistry = new FinalizationRegistry<string>(
  (remoteCallbackId) => {
    bridge.send(
      $removeRemoteCallback,
      { callbackId: remoteCallbackId },
      getCallbackRoutingId(remoteCallbackId) ?? undefined
    );
  }
);

function deserializeCallbackId(callbackId: string) {
  async function remoteCallbackInvoker(...args: unknown[]) {
    log.debug(`Invoking remote callback "${callbackId}" with args`, args);

    return await bridge.send(
      $triggerRemoteCallback,
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
