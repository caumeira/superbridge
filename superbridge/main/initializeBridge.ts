import { $execute, $reset } from "../shared/messages";
import { BridgeHandler, BridgeHandlerInput } from "./BridgeHandler";

import { bridge } from "../shared/superbridge";
import { createLogger } from "../shared/log";

const log = createLogger("superbridge/main/init");

export function initializeSuperbridgeMain<T extends BridgeHandlerInput>(
  handler: BridgeHandler<T>
) {
  log.debug("Initialize Superbridge Main");

  process.env.SUPERBRIDGE_SCHEMA = JSON.stringify(handler.schema);

  bridge.handle($execute, async (payload) => {
    log.debug(`Handling execute "${payload.path}" with args`, payload.args);
    return handler.execute(payload.path, payload.args);
  });

  bridge.handle($reset, async () => {
    log.debug("Handling reset");
    await handler.reset();
  });
}
