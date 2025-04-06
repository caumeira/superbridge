import "../shared/init";

import { BridgeMessageType } from "../shared/defineMessage";
import { HandleResult } from "../shared/messages";
import { bridgeSerializer } from "../shared/serializer";
import { generateId } from "../utils/id";
import { initializeSuperbridge } from "../shared/superbridge";

const { $superbridgeinterface } = window;

initializeSuperbridge({
  async send<I, O>(
    message: BridgeMessageType<I, O>,
    payload: I,
    webId?: number
  ) {
    if (webId !== undefined) {
      console.warn(
        "Sending message to specific webContents is not supported in the client"
      );
      webId = undefined;
    }

    const requestId = generateId();

    const result = await $superbridgeinterface.send(message.type, {
      requestId,
      payload: bridgeSerializer.serialize(payload),
    });

    return bridgeSerializer.deserialize(result) as O;
  },
  handle<I, O>(
    message: BridgeMessageType<I, O>,
    handler: (payload: I) => Promise<O>
  ) {
    return $superbridgeinterface.handle(
      message.type,
      async ({ requestId, payload }) => {
        try {
          const result = await handler(
            bridgeSerializer.deserialize(payload) as I
          );

          await $superbridgeinterface.send("HANDLE_RESULT", {
            requestId,
            payload: bridgeSerializer.serialize({
              requestId,
              type: "success",
              result,
            } as HandleResult<O>),
          });
        } catch (error) {
          await $superbridgeinterface.send("HANDLE_RESULT", {
            requestId,
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
