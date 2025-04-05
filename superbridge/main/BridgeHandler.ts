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

export type BridgeSingleHandler =
  | Query<any[], any>
  | Mutation<any[], any>
  | Effect<any[]>;

export type BridgeHandlerInput = BridgeNestedObject<BridgeSingleHandler>;

export class BridgeHandler<T extends BridgeHandlerInput> {
  private handlersMap: Map<string, BridgeSingleHandler>;
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

  private getHandler(path: string) {
    const handler = this.handlersMap.get(path);

    if (!handler) {
      throw new Error(`Handler for path ${path} not found`);
    }

    return handler;
  }

  async execute(path: string, args: unknown[]) {
    log.debug(`Execute "${path}" with args`, args);

    const handler = this.getHandler(path);

    if (!handler) {
      throw new Error(`Handler for path ${path} not found`);
    }

    await this.waitForPendingMutations();

    if (getIsMutation(handler)) {
      const resultPromise = handler(...args);

      this.addPendingMutation(resultPromise);

      return resultPromise;
    }

    if (getIsEffect(handler)) {
      const cleanupPromise = handler(...args);

      this.runningEffects.add(cleanupPromise);

      return async () => {
        this.runningEffects.delete(cleanupPromise);

        const cleanup = await cleanupPromise;

        try {
          cleanup();
        } catch {
          console.error("Error cleaning up effect");
        }
      };
    }

    return handler(...args);
  }

  async cleanAllEffects() {
    const cleanupPromises = [...this.runningEffects];

    this.runningEffects.clear();

    for (const cleanupPromise of cleanupPromises) {
      const cleanup = await cleanupPromise;

      try {
        cleanup();
      } catch {
        console.error("Error cleaning up effect", cleanupPromise);
      }
    }
  }

  async reset() {
    log.debug("Reset");
    await this.cleanAllEffects();

    this.pendingMutations.clear();
  }
}

export function createBridgeHandler<T extends BridgeHandlerInput>(
  input: T
): BridgeHandler<T> {
  return new BridgeHandler(input);
}
