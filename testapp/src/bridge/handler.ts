import {
  createRouter,
  effect,
  mutation,
  query,
  sharedValue,
} from "superbridge/main";

let foo = "foo";

const settings = sharedValue({
  theme: "light",
});

settings.watch((value) => {
  console.log("settings changed (main)", value);
  if (value.theme === "dark") {
    setTimeout(() => {
      settings.setValue({
        theme: "light",
      });
    }, 1000);
  }
});

export const bridgeHandler = createRouter({
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
  settings,
  reply: query(async <T>(message: T) => {
    return message;
  }),
});

export type AppBridge = typeof bridgeHandler;
