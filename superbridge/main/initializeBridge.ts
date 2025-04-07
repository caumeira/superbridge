import {
  $execute,
  $getSharedValue,
  $reset,
  $setSharedValue,
  $watchSharedValue,
} from "../shared/messages";
import { Router, RouterInput } from "./BridgeHandler";

import SuperJSON from "superjson";
import { bridge } from "../shared/superbridge";
import { createLogger } from "../shared/log";

const log = createLogger("superbridge/main/init");

export function initializeSuperbridgeMain<T extends RouterInput>(
  handler: Router<T>
) {
  log.debug("Initialize Superbridge Main");

  process.env.SUPERBRIDGE_SCHEMA = SuperJSON.stringify(handler.schema);

  bridge.handle($execute, async (payload) => {
    log.debug(`Handling execute "${payload.path}" with args`, payload.args);
    return handler.execute(payload.path, payload.args);
  });

  bridge.handle($reset, async () => {
    log.debug("Handling reset");
    await handler.reset();
  });

  bridge.handle($getSharedValue, async (payload) => {
    log.debug(`Handling getSharedValue "${payload.path}"`);
    return handler.getSharedValue(payload.path);
  });

  bridge.handle($setSharedValue, async (payload) => {
    log.debug(
      `Handling setSharedValue "${payload.path}" with value`,
      payload.value
    );
    await handler.setSharedValue(payload.path, payload.value);
  });

  bridge.handle($watchSharedValue, async ({ path, callback }) => {
    log.debug(`Handling watchSharedValue "${path}" with callback`, callback);
    return handler.watchSharedValue(path, callback);
  });
}
