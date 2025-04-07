import { type AppBridge } from "./handler";
import { createSuperbridgeClient } from "superbridge/client";
import { bridge } from "superbridge";
import { $getBody } from "./message";

export const appClient = createSuperbridgeClient<AppBridge>();

bridge.handle($getBody, async () => {
  return document.body.innerHTML;
});

console.log("appClient", appClient);

appClient.settings.watch(async (value) => {
  if (value.theme === "light") {
    setTimeout(() => {
      appClient.settings.set({
        theme: "dark",
      });
    }, 1000);
  }
});

Reflect.set(window, "client", appClient);

Reflect.set(window, "testReply", (value: any) => {
  appClient.reply(value).then((result) => {
    console.log("result", result);
  });
});
