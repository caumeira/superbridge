export class BridgeMessageType<I, O> {
  constructor(public readonly type: string) {}

  input!: I;
  output!: O;
}

export function defineBridgeMessage<I, O = void>(
  name: string
): BridgeMessageType<I, O> {
  return new BridgeMessageType<I, O>(name);
}
