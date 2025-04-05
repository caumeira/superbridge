import { CustomTransfomer } from "./types";
import { bridge } from "../superbridge";
import { defineBridgeMessage } from "../defineMessage";
import { generateId } from "../../utils/id";

const signalRemoteController = new Map<string, AbortController>();

export const $abortRemoteSignal = defineBridgeMessage<{
  signalId: string;
}>("$abortRemoteSignal");

export function registerSignal(localSignal: AbortSignal) {
  const id = `$$signal-${generateId()}`;
  const remoteController = new AbortController();

  signalRemoteController.set(id, remoteController);

  // If local signal is aborted, abort the remote one
  localSignal.addEventListener("abort", () => {
    bridge.send($abortRemoteSignal, { signalId: id });
    signalRemoteController.delete(id);
  });

  signalFinalizationRegistry.register(localSignal, id);

  return id;
}

bridge.handle($abortRemoteSignal, async ({ signalId }) => {
  const controller = signalRemoteController.get(signalId);

  if (!controller) return;

  controller.abort();
  signalRemoteController.delete(signalId);
});

const signalFinalizationRegistry = new FinalizationRegistry<string>(
  (remoteSignalId) => {
    const controller = signalRemoteController.get(remoteSignalId);

    if (!controller) return;

    controller.abort();
    signalRemoteController.delete(remoteSignalId);
  }
);

function deserializeSignalId(signalId: string): AbortSignal {
  const controller = new AbortController();

  signalRemoteController.set(signalId, controller);

  return controller.signal;
}

export const abortSignalSerializer: CustomTransfomer<AbortSignal, string> = {
  isApplicable: (value): value is AbortSignal => value instanceof AbortSignal,
  serialize: (signal: AbortSignal) => registerSignal(signal),
  deserialize: (signalId: string) => deserializeSignalId(signalId),
};
