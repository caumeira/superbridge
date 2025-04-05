import { createLogger } from "./log";
import { getMessagesHandler } from "./messagesHandler";
import { type IpcRendererEvent, type IpcMainInvokeEvent } from "electron";

const log = createLogger("superbridge/messages");

type Cancel = () => void;

interface MessageDefinition<I, O> {
  name: string;
  send: (payload: I, webId?: number) => Promise<O>;
  handle: (
    handler: (
      payload: I,
      event: IpcRendererEvent | IpcMainInvokeEvent
    ) => Promise<O>
  ) => Cancel;
}

const registeredMessageTypes = new Set<string>();

export function defineBridgeMessage<I, O = void>(
  name: string
): MessageDefinition<I, O> {
  if (registeredMessageTypes.has(name)) {
    log.warn(`Message "${name}" is already registered`);
  }

  registeredMessageTypes.add(name);

  return {
    name,
    async send(payload: I, webId?: number) {
      log.debug(`Sending "${name}" with payload`, payload);
      const messagesHandler = getMessagesHandler();

      return messagesHandler.send(name, payload, webId);
    },
    handle(handler) {
      const messagesHandler = getMessagesHandler();

      return messagesHandler.handle(name, (payload, event) => {
        log.debug(`Handling "${name}" with payload`, payload);
        return handler(payload as I, event);
      });
    },
  };
}
