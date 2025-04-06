import { BridgeHandlerSchema, getBridgeHandlerSchema } from "./schema";
import { Effect, getIsEffect } from "./effect";
import { Mutation, getIsMutation } from "./mutation";

import { MaybePromise } from "../shared/types";
import { Query } from "./query";
import { createLogger } from "../shared/log";
import { createNestedRecordPropertiesMap } from "../utils/nestedRecord";

const log = createLogger("superbridge/main/BridgeHandler");

export type BridgeNestedObject<LeafType> = {
  [key: string]: BridgeNestedObject<LeafType> | LeafType;
};

type Cleanup = () => void;

//
export type BridgeSingleHandler =
  | Query<any[], any>
  | Mutation<any[], any>
  | Effect<any[]>;

export type BridgeHandlerInput = BridgeNestedObject<BridgeSingleHandler>;

// Define the handlersMap type separately to ensure it's preserved in declarations
export type BridgeHandlerMap = Map<string, BridgeSingleHandler>;

export class BridgeHandler<T extends BridgeHandlerInput> {
  private handlersMap: BridgeHandlerMap = new Map();
  public readonly schema: BridgeHandlerSchema;

  constructor(public readonly input: T) {
    this.handlersMap =
      createNestedRecordPropertiesMap<BridgeSingleHandler>(input);
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

  private getHandler(path: string): BridgeSingleHandler {
    const handler = this.handlersMap.get(path);

    if (!handler) {
      throw new Error(`Handler not found for path: ${path}`);
    }

    return handler;
  }

  async execute(path: string, args: unknown[]): Promise<unknown> {
    const handler = this.getHandler(path);

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

    return handler(...args);
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

export function createBridgeHandler<T extends BridgeHandlerInput>(
  input: T
): BridgeHandler<T> {
  return new BridgeHandler(input);
}
