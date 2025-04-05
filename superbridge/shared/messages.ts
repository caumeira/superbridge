import { defineBridgeMessage } from "./defineMessage";

export interface ExecuteMessageData {
  id: string;
  path: string;
  args: unknown[];
}

export type HandleResult<T> =
  | {
      requestId: string;
      type: "success";
      result: T;
    }
  | {
      requestId: string;
      type: "error";
      error: string;
    };

export const $execute = defineBridgeMessage<ExecuteMessageData, unknown>(
  "$execute"
);

export const $reset = defineBridgeMessage<void, void>("$reset");
