# Superbridge

`superbridge` is a powerful, type-safe, and easy-to-use Electron bridge with support for sending callback functions over the bridge.

Visit [superbridge.dev](https://superbridge.dev) for full documentation.

```sh npm2yarn
npm install superbridge
```

## Setting up

In order to set up `superbridge`, we need to:

- Create a bridge (set of functions the client will be able to call)
- Initialize it in the main process
- Initialize the bridge in the preload
- Create the client

These are a bit of boilerplate, but the `superbridge` API is designed to make it as simple as possible.

### Router

First, let's create a simple router. The router is a set of functions that will be available to the client.

In this example, we only create a simple `ping` function that takes a message and returns a pong with it.

There are many more powerful features, like subscriptions, effects, shared values, etc. We will cover them in the next sections.

```ts filename="router.ts" {3-7, 9}
import { createRouter } from "superbridge/main";

export const appRouter = createRouter({
  ping(message: string) {
    return `pong ${message}`;
  },
});

export type AppRouter = typeof appRouter; // Will be used to make the client type-safe
```

### Main process

Now, in the main process, we need to initialize the router. This needs to be done before we create the `BrowserWindow`.

It is as simple as calling `initializeSuperbridgeMain` with our router.

```ts filename="electron/main.ts" {4}
import { initializeSuperbridgeMain } from "superbridge/main";
import { appRouter } from "./router";

initializeSuperbridgeMain(appRouter);
```

### Preload

Now, we need to allow the client to call our router.

We can do this by calling `initializeSuperbridgePreload` inside the preload script.

```ts filename="electron/preload.ts" {3}
import { initializeSuperbridgePreload } from "superbridge/preload";

initializeSuperbridgePreload();
```

### Client

Finally, let's create the client inside the renderer process.

We do this by calling `createSuperbridgeClient` with our router type.

```ts filename="client.ts"
import { type AppBridge } from "./handler";
import { createSuperbridgeClient } from "superbridge/client";

export const appClient = createSuperbridgeClient<AppBridge>();
```

> [!NOTE]
>
> It is important to explicitly import `AppBridge` as a type-only import. Otherwise, the entire router will be bundled into the client, which is also likely to crash, as the router is running in a Node environment, not a browser environment.

### Use the client

Now, our client is ready to use!

```ts filename="client.ts"
const pong = await appClient.ping("hello");
console.log(pong); // pong hello
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
