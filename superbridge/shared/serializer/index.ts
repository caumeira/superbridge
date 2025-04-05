import SuperJSON from "superjson";
import { abortSignalSerializer } from "./abortSignal";
import { callbackSerializer } from "./callbacks";

export const bridgeSerializer = new SuperJSON();

bridgeSerializer.registerCustom(callbackSerializer, "superbridge-callback");
bridgeSerializer.registerCustom(
  abortSignalSerializer,
  "superbridge-abortSignal"
);
