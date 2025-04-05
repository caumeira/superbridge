import { BridgeHandlerInput } from "./BridgeHandler";
import { createNestedRecordPropertiesMap } from "../utils/nestedRecord";
import { getIsEffect } from "./effect";
import { getIsMutation } from "./mutation";
import { getIsQuery } from "./query";

export type BridgeFieldSchema = {
  type: "query" | "mutation" | "effect";
};

export type BridgeHandlerSchema = Record<string, BridgeFieldSchema>;

export function getBridgeHandlerSchema(input: BridgeHandlerInput) {
  const map = createNestedRecordPropertiesMap(input);

  const schema: BridgeHandlerSchema = {};

  for (const [key, value] of map.entries()) {
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

    console.warn(`Unknown field type: ${key}`, value);
  }

  return schema;
}
