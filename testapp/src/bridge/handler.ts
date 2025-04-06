import { createBridgeHandler, effect, mutation, query } from "superbridge/main";

let foo = "foo";

export const bridgeHandler = createBridgeHandler({
  ping: query(async (date: Date, onProgress?: (progress: number) => void) => {
    for (let i = 0; i < 10; i++) {
      onProgress?.(i);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return `pong ${date.toISOString()}`;
  }),
  pings: effect(
    (
      interval: number,
      callback: (date: Date, main: (main: string) => void) => void
    ) => {
      console.log("setting interval");
      function main(main: string) {
        console.log("mainaaaa", main);
      }

      const intervalId = setInterval(() => {
        callback(new Date(), main);
      }, interval);

      return () => {
        console.log("clearing interval");
        clearInterval(intervalId);
      };
    }
  ),
  foo: {
    change: mutation(async (message: string) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      foo = message;
    }),
    get: query(async () => {
      return foo;
    }),
  },
});

export type AppBridge = typeof bridgeHandler;
