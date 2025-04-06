import { type AppBridge } from "./handler";
import { createSuperbridgeClient } from "superbridge/client";
import { bridge } from "superbridge";
import { $getBody } from "./message";

export const appClient = createSuperbridgeClient<AppBridge>();

bridge.handle($getBody, async () => {
  return document.body.innerHTML;
});
