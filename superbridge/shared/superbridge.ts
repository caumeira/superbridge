import { BridgeMessageType } from "./defineMessage";
import { Signal } from "../utils/Signal";

type Cancel = () => void;

export interface SuperbridgeLink {
  send<I, O>(
    message: BridgeMessageType<I, O>,
    payload: I,
    webId?: number
  ): Promise<O>;

  handle<I, O>(
    message: BridgeMessageType<I, O>,
    handler: (payload: I) => Promise<O>
  ): Cancel;
}

const currentSuperbridgeChannel = new Signal<SuperbridgeLink>();

export function initializeSuperbridge(superbridge: SuperbridgeLink) {
  currentSuperbridgeChannel.emit(superbridge);
}

export const bridge: SuperbridgeLink = {
  send<I, O>(message: BridgeMessageType<I, O>, payload: I, webId?: number) {
    const link = currentSuperbridgeChannel.assertLastValue(
      "Superbridge is not initialized"
    );

    return link.send(message, payload, webId);
  },
  handle<I, O>(
    message: BridgeMessageType<I, O>,
    handler: (payload: I) => Promise<O>
  ) {
    if (!currentSuperbridgeChannel.hasLastValue) {
      Promise.resolve().then(() => {
        if (!currentSuperbridgeChannel.hasLastValue) {
          console.warn("Superbridge is not initialized");
        }
      });
    }
    return currentSuperbridgeChannel.effect((currentBridge) => {
      return currentBridge.handle(message, handler);
    });
  },
};
