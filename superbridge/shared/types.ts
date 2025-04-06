import { SuperJSONResult } from "superjson";

export type MaybePromise<T> = T | Promise<T>;

export interface RawBridgeData {
  requestId: string;
  payload: SuperJSONResult;
}
