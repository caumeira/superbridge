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

export const $setSharedValue = defineBridgeMessage<
  {
    path: string;
    value: unknown;
  },
  void
>("$setSharedValue");

export const $getSharedValue = defineBridgeMessage<
  {
    path: string;
  },
  unknown
>("$getSharedValue");

export const $watchSharedValue = defineBridgeMessage<
  {
    path: string;
    callback: (value: unknown) => void;
  },
  () => void
>("$watchSharedValue");

export const $reset = defineBridgeMessage<void, void>("$reset");
