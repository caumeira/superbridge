import { RouterInput } from "./BridgeHandler";
import { createNestedRecordPropertiesMap } from "../utils/nestedRecord";
import { getIsEffect } from "./effect";
import { getIsMutation } from "./mutation";
import { getIsQuery } from "./query";
import { getIsSharedValue } from "./sharedValue";
import { createLogger } from "../shared/log";

const log = createLogger("superbridge/main/schema");

export type BridgeFieldSchema =
  | {
      type: "query" | "mutation" | "effect";
    }
  | {
      type: "sharedValue";
      initialValue: any;
    };

export type BridgeHandlerSchema = Record<string, BridgeFieldSchema>;

export function getBridgeHandlerSchema(input: RouterInput) {
  const map = createNestedRecordPropertiesMap(input);

  const schema: BridgeHandlerSchema = {};

  for (const [key, value] of map.entries()) {
    log.debug(`Handling router input ${key} to handler ${value}`);
    if (getIsSharedValue(value)) {
      schema[key] = {
        type: "sharedValue",
        initialValue: value.initialValue,
      };
      continue;
    }

    if (getIsQuery(value)) {
      schema[key] = {
        type: "query",
      };
      continue;
    }

    if (getIsMutation(value)) {
      schema[key] = {
        type: "mutation",
      };
      continue;
    }

    if (getIsEffect(value)) {
      schema[key] = {
        type: "effect",
      };
      continue;
    }

    if (typeof value === "function") {
      schema[key] = {
        type: "query",
      };
      continue;
    }

    log.warn(`Unknown field type: ${key}`, value);
  }

  return schema;
}
