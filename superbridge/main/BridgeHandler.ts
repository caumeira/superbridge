import { BridgeHandlerSchema, getBridgeHandlerSchema } from "./schema";
import { Effect, getIsEffect } from "./effect";
import { Mutation, getIsMutation } from "./mutation";
import { Query, getIsQuery } from "./query";
import { SharedValue, getIsSharedValue } from "./sharedValue";

import { MaybePromise } from "../shared/types";
import { Signal } from "../utils/Signal";
import { createLogger } from "../shared/log";
import { createNestedRecordPropertiesMap } from "../utils/nestedRecord";

const log = createLogger("superbridge/main/BridgeHandler");

export type BridgeNestedObject<LeafType> = {
  [key: string]: BridgeNestedObject<LeafType> | LeafType;
};

type Cleanup = () => void;
type AnyFunction = (...args: any[]) => any;
//
export type RouterSingleHandler =
  | Query<AnyFunction>
  | Mutation<AnyFunction>
  | Effect<any[]>
  | SharedValue<any>;

export type RouterInput = BridgeNestedObject<RouterSingleHandler>;

// Define the handlersMap type separately to ensure it's preserved in declarations
export type RouterHandlersMap = Map<string, RouterSingleHandler>;

interface SharedValueState<T> {
  value: T;
  initialValue: T;
  updates: Signal<T>;
}

export class Router<T extends RouterInput> {
  private handlersMap: RouterHandlersMap = new Map();
  public readonly schema: BridgeHandlerSchema;

  constructor(public readonly input: T) {
    this.handlersMap =
      createNestedRecordPropertiesMap<RouterSingleHandler>(input);
    this.schema = getBridgeHandlerSchema(input);
  }

  private pendingMutations = new Set<Promise<unknown>>();
  private runningEffects = new Set<MaybePromise<Cleanup>>();

  private async waitForPendingMutations() {
    while (this.pendingMutations.size) {
      const promises = [...this.pendingMutations];

      for (const promise of promises) {
        try {
          await promise;
        } catch {}
      }
    }
  }

  private addPendingMutation(promise: Promise<unknown>) {
    this.pendingMutations.add(promise);

    promise.finally(() => {
      this.pendingMutations.delete(promise);
    });
  }

  private getHandler(path: string): RouterSingleHandler {
    const handler = this.handlersMap.get(path);

    if (!handler) {
      throw new Error(`Handler not found for path: ${path}`);
    }

    return handler;
  }

  async execute(path: string, args: unknown[]): Promise<unknown> {
    const handler = this.getHandler(path);

    if (getIsSharedValue(handler)) {
      throw new Error("Shared values are not supported in execute");
    }

    if (getIsMutation(handler)) {
      const promise = handler(...args);

      this.addPendingMutation(promise);

      return promise;
    }

    if (getIsEffect(handler)) {
      const cleanup = handler(...args);

      this.runningEffects.add(cleanup);

      return cleanup;
    }

    if (getIsQuery(handler)) {
      return handler(...args);
    }

    throw new Error(`Unknown handler type: ${handler}`);
  }

  getSharedValue(path: string) {
    const handler = this.getHandler(path);

    if (!getIsSharedValue(handler)) {
      throw new Error("Shared values are not supported in getSharedValue");
    }

    return handler.getValue();
  }

  setSharedValue(path: string, value: unknown) {
    const handler = this.getHandler(path);

    if (!getIsSharedValue(handler)) {
      throw new Error("Shared values are not supported in setSharedValue");
    }

    handler.setValue(value);
  }

  watchSharedValue(path: string, callback: (value: unknown) => void) {
    const handler = this.getHandler(path);

    if (!getIsSharedValue(handler)) {
      throw new Error("Shared values are not supported in watchSharedValue");
    }

    return handler.watch(callback);
  }

  async cleanAllEffects(): Promise<void> {
    const effects = [...this.runningEffects];

    for (const effect of effects) {
      try {
        const cleanup = await effect;

        if (typeof cleanup === "function") {
          cleanup();
        }
      } catch {}
    }

    this.runningEffects.clear();
  }

  async reset(): Promise<void> {
    await this.cleanAllEffects();
    await this.waitForPendingMutations();
  }
}

export function createRouter<T extends RouterInput>(input: T): Router<T> {
  return new Router(input);
}
