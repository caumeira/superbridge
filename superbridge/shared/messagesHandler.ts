import { createLogger } from "./log";
import { MaybePromise } from "./types";
import { type IpcRendererEvent, type IpcMainInvokeEvent } from "electron";

const log = createLogger("superbridge/messagesHandler");

type Cancel = () => void;

export type MessageHandler<I, O> = (
  payload: I,
  event: IpcMainInvokeEvent | IpcRendererEvent
) => MaybePromise<O>;

interface MessagesHandler {
  send<I, O>(type: string, payload: I, webId?: number): Promise<O>;
  handle<I, O>(type: string, handler: MessageHandler<I, O>): Cancel;
}

let messagesHandler: MessagesHandler | null = null;

export function setMessagesHandler(handler: MessagesHandler) {
  log.debug("Set messages handler", handler);
  messagesHandler = handler;
}

export function getMessagesHandler(): MessagesHandler {
  if (!messagesHandler) {
    throw new Error("Messages handler not set");
  }

  return messagesHandler;
}
