import { type AppBridge } from "./handler";
import { createSuperbridgeClient } from "superbridge/client";
import { $getBodyId } from "./message";

export const appClient = createSuperbridgeClient<AppBridge>();

$getBodyId.handle(async () => {
  return document.body.innerHTML;
});
