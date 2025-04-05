import { MessageHandler, setMessagesHandler } from "../shared/messagesHandler";

import { type SuperBridgeInterface } from "../preload";
import { initializeShared } from "../shared/init";
import { createLogger } from "../shared/log";
import { HandleResult } from "../shared/messages";
import { bridgeSerializer } from "../shared/serializer";
import { generateId } from "../utils/id";

const log = createLogger("superbridge/client/init");

const $superbridge = window.$superbridge as SuperBridgeInterface;

function initializeSuperbridgeHandler() {
  setMessagesHandler({
    async send<I, O>(type: string, payload: I, webId?: number) {
      if (webId !== undefined) {
        console.warn(
          "Sending message to specific webContents is not supported in the client"
        );
        webId = undefined;
      }

      const requestId = generateId();
      const result = await $superbridge.send(type, {
        requestId,
        webId: $superbridge.routingId,
        payload: bridgeSerializer.serialize(payload),
      });

      return bridgeSerializer.deserialize(result) as O;
    },
    handle<I, O>(type: string, handler: MessageHandler<I, O>) {
      return $superbridge.handle(
        type,
        async ({ requestId, payload }, event) => {
          try {
            const result = await handler(
              bridgeSerializer.deserialize(payload) as I,
              event
            );

            await $superbridge.send("HANDLE_RESULT", {
              requestId,
              webId: $superbridge.routingId,
              payload: bridgeSerializer.serialize({
                requestId,
                type: "success",
                result,
              } as HandleResult<O>),
            });
          } catch (error) {
            await $superbridge.send("HANDLE_RESULT", {
              requestId,
              webId: $superbridge.routingId,
              payload: bridgeSerializer.serialize({
                requestId,
                type: "error",
                error,
              } as HandleResult<O>),
            });
          }
        }
      );
    },
  });
}

export function initializeSuperbridgeClient() {
  log.debug("Initialize Superbridge Client");
  initializeSuperbridgeHandler();
  initializeShared();
}
