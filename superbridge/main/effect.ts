const EFFECT_SYMBOL = Symbol("effect");

type Cleanup = () => void;
type MaybePromise<T> = T | Promise<T>;

export interface Effect<Args extends unknown[] = unknown[]> {
  (...args: Args): MaybePromise<Cleanup>;
  [EFFECT_SYMBOL]: "effect";
}

export function getIsEffect<Args extends unknown[]>(
  value: unknown
): value is Effect<Args> {
  return (
    typeof value === "function" &&
    EFFECT_SYMBOL in value &&
    value[EFFECT_SYMBOL] === "effect"
  );
}

export function effect<Args extends unknown[]>(
  handler: (...args: Args) => MaybePromise<Cleanup>
): Effect<Args> {
  const effectFunction: Effect<Args> = async (...args: Args) => {
    return handler(...args);
  };

  effectFunction[EFFECT_SYMBOL] = "effect";

  return effectFunction;
}
