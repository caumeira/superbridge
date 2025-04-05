import { abortSignalSerializer, initializeRemoteSignals } from "./abortSignal";
import { callbackSerializer, initializeRemoteCallbacks } from "./callbacks";

import SuperJSON from "superjson";
import { createLogger } from "../log";
import { once } from "../../utils/once";

const log = createLogger("superbridge/serializer");

export const bridgeSerializer = new SuperJSON();

export const initializeRemoteSerializer = once(() => {
  log.debug("Initialize remote serializer");
  initializeRemoteCallbacks();
  initializeRemoteSignals();
});

bridgeSerializer.registerCustom(callbackSerializer, "superbridge-callback");
bridgeSerializer.registerCustom(
  abortSignalSerializer,
  "superbridge-abortSignal"
);
