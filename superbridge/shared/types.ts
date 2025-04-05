import { SuperJSONResult } from "superjson";

export interface SuperbridgeSubscriptionListener<T> {
  onData: (data: T) => void;
  onError: (error: unknown) => void;
  onComplete: () => void;
}

export type MaybePromise<T> = T | Promise<T>;

export interface RawBridgeData {
  requestId: string;
  webId: number;
  payload: SuperJSONResult;
}
