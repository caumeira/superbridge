import { type AppBridge } from "./handler";
import { createSuperbridgeClient } from "superbridge/client";
import { bridge } from "superbridge";
import { $getBodyId } from "./message";

export const appClient = createSuperbridgeClient<AppBridge>();

bridge.handle($getBodyId, async () => {
  return document.body.innerHTML;
});
