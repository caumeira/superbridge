import "./init";
import { type Router, RouterInput } from "../main/BridgeHandler";
import { Effect } from "../main/effect";
import { Mutation } from "../main/mutation";
import { Query } from "../main/query";
import { createLogger } from "../shared/log";
import {
  $execute,
  $getSharedValue,
  $reset,
  $setSharedValue,
  $watchSharedValue,
} from "../shared/messages";
import { generateId } from "../utils/id";
import { unwrapNestedRecord } from "../utils/nestedRecord";
import { bridge } from "../shared/superbridge";
import { SharedValue } from "../main/sharedValue";
import { updateValue, ValueUpdater } from "../utils/valueUpdater";
import { createCleanup, Cleanup } from "../utils/cleanup";
import { Signal } from "../utils/Signal";
import { $moduleCleanup } from "../utils/moduleCleanup";
const CLIENT_SYMBOL = Symbol("superbridge-client");

const log = createLogger("superbridge/client");

type AnyFunction = (...args: any[]) => any;

type QueryClient<F extends AnyFunction> = (
  ...args: Parameters<F>
) => Promise<Awaited<ReturnType<F>>>;

type MutationClient<F extends AnyFunction> = (
  ...args: Parameters<F>
) => Promise<Awaited<ReturnType<F>>>;

type EffectClient<Args extends any[]> = (...args: Args) => VoidFunction;

type SuperbridgeClientValue<T> = T extends Query<infer F>
  ? QueryClient<F>
  : T extends Mutation<infer F>
  ? MutationClient<F>
  : T extends Effect<infer Args>
  ? EffectClient<Args>
  : T extends SharedValue<infer T>
  ? SharedValueClient<T>
  : T extends RouterInput
  ? SuperbridgeClient<T>
  : T extends AnyFunction
  ? QueryClient<T>
  : never;

export type SuperbridgeClient<T extends RouterInput> = {
  [K in keyof T]: SuperbridgeClientValue<T[K]>;
} & SuperbridgeClientMethods;

interface SuperbridgeClientMethods {
  destroy: Cleanup;
}

function createQueryClient<Args extends any[], Result>(path: string) {
  return async function query(...args: Args): Promise<Awaited<Result>> {
    log.debug(`Query "${path}" with args`, args);
    await resetPromise;

    return bridge.send($execute, {
      id: generateId(),
      path,
      args,
    }) as Promise<Awaited<Result>>;
  };
}

function createMutationClient<Args extends any[], Result>(path: string) {
  return async function mutation(...args: Args): Promise<Awaited<Result>> {
    log.debug(`Mutation "${path}" with args`, args);
    await resetPromise;

    return bridge.send($execute, {
      id: generateId(),
      path,
      args,
    }) as Promise<Awaited<Result>>;
  };
}

function createEffectClient<Args extends any[]>(
  path: string,
  destroy: Cleanup
) {
  return function effect(...args: Args) {
    log.debug(`Effect "${path}" with args`, args);
    const maybeCleanupPromise = resetPromise.then(() =>
      bridge.send($execute, {
        id: generateId(),
        path,
        args,
      })
    );

    async function cleanup() {
      destroy.remove(cleanup);
      try {
        const cleanup = await maybeCleanupPromise;

        if (typeof cleanup === "function") {
          cleanup();
        }
      } catch (error) {
        console.error(error);
      }
    }

    destroy.add(cleanup);

    return cleanup;
  };
}

class SharedValueClient<T> {
  private signal = new Signal<T>();

  get value() {
    if (this.signal.hasLastValue) {
      return this.signal.lastValue as T;
    }

    return this.initialValue;
  }

  private startWatching() {
    const stopWatchingPromise = bridge.send($watchSharedValue, {
      path: this.path,
      callback: (value: T) => {
        console.log("has from main", value);
        this.signal.emit(value);
      },
    });

    return () => {
      stopWatchingPromise.then((stop) => {
        stop();
      });
    };
  }

  constructor(
    readonly path: string,
    readonly initialValue: T,
    private readonly destroy: Cleanup
  ) {
    this.destroy.next = this.startWatching();
  }

  get() {
    return this.value;
  }

  set(value: T) {
    this.signal.emit(value);
    return bridge.send($setSharedValue, { path: this.path, value });
  }

  watch(callback: (value: T) => void) {
    return this.signal.subscribe(callback);
  }

  update(updater: ValueUpdater<T>) {
    this.set(updateValue(this.value, updater));
  }
}

let resetPromise: Promise<void>;

export function createSuperbridgeClient<
  T extends Router<any>
>(): SuperbridgeClient<T["input"]> {
  resetPromise = bridge.send($reset, undefined);

  const destroy = createCleanup();

  const schema = window.$superbridgeinterface.schema;

  if (!schema) {
    throw new Error("Schema is not initialized");
  }

  const flatClient: Record<string, any> = {};

  for (const [path, fieldSchema] of Object.entries(schema)) {
    if (fieldSchema.type === "query") {
      flatClient[path] = createQueryClient(path);
    }

    if (fieldSchema.type === "mutation") {
      flatClient[path] = createMutationClient(path);
    }

    if (fieldSchema.type === "effect") {
      flatClient[path] = createEffectClient(path, destroy);
    }

    if (fieldSchema.type === "sharedValue") {
      flatClient[path] = new SharedValueClient(
        path,
        fieldSchema.initialValue,
        destroy
      );
    }
  }

  const client = unwrapNestedRecord(flatClient) as SuperbridgeClient<
    T["input"]
  >;

  Reflect.set(client, CLIENT_SYMBOL, true);

  client.destroy = destroy;

  $moduleCleanup[CLIENT_SYMBOL] = destroy;

  return client;
}
