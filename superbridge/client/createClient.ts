import { type BridgeHandler, BridgeHandlerInput } from "../main/BridgeHandler";
import { Effect } from "../main/effect";
import { Mutation } from "../main/mutation";
import { Query } from "../main/query";
import { createLogger } from "../shared/log";
import { $execute, $reset } from "../shared/messages";
import { generateId } from "../utils/id";
import { unwrapNestedRecord } from "../utils/nestedRecord";
import { initializeSuperbridgeClient } from "./init";

const CLIENT_SYMBOL = Symbol("superbridge-client");

const log = createLogger("superbridge/client");

type Cleanup = () => void;

type QueryClient<Args extends any[], Result> = (
  ...args: Args
) => Promise<Awaited<Result>>;
type MutationClient<Args extends any[], Result> = (
  ...args: Args
) => Promise<Awaited<Result>>;
type EffectClient<Args extends any[]> = (...args: Args) => Cleanup;

type SuperbridgeClientValue<T> = T extends Query<infer Args, infer Result>
  ? QueryClient<Args, Result>
  : T extends Mutation<infer Args, infer Result>
  ? MutationClient<Args, Result>
  : T extends Effect<infer Args>
  ? EffectClient<Args>
  : T extends BridgeHandlerInput
  ? SuperbridgeClient<T>
  : never;

export type SuperbridgeClient<T extends BridgeHandlerInput> = {
  [K in keyof T]: SuperbridgeClientValue<T[K]>;
};

function createQueryClient<Args extends any[], Result>(path: string) {
  return async function query(...args: Args): Promise<Awaited<Result>> {
    log.debug(`Query "${path}" with args`, args);
    await resetPromise;

    return $execute.send({
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

    return $execute.send({
      id: generateId(),
      path,
      args,
    }) as Promise<Awaited<Result>>;
  };
}

function createEffectClient<Args extends any[]>(path: string) {
  return function effect(...args: Args) {
    log.debug(`Effect "${path}" with args`, args);
    const maybeCleanupPromise = resetPromise.then(() =>
      $execute.send({
        id: generateId(),
        path,
        args,
      })
    );

    return async function cleanup() {
      try {
        const cleanup = await maybeCleanupPromise;

        if (typeof cleanup === "function") {
          cleanup();
        }
      } catch (error) {
        console.error(error);
      }
    };
  };
}

let resetPromise: Promise<void>;

export function createSuperbridgeClient<
  T extends BridgeHandler<any>
>(): SuperbridgeClient<T["input"]> {
  initializeSuperbridgeClient();

  resetPromise = $reset.send();

  const schema = window.$superbridge.schema;

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
      flatClient[path] = createEffectClient(path);
    }
  }

  const client = unwrapNestedRecord(flatClient) as SuperbridgeClient<
    T["input"]
  >;

  Reflect.set(client, CLIENT_SYMBOL, true);

  return client;
}
