const MUTATION_SYMBOL = Symbol("mutation");

type AnyFunction = (...args: any[]) => any;
export interface Mutation<F extends AnyFunction> {
  (...args: Parameters<F>): Promise<ReturnType<F>>;
  [MUTATION_SYMBOL]: "mutation";
}

export function getIsMutation<F extends AnyFunction>(
  value: unknown
): value is Mutation<F> {
  return (
    typeof value === "function" &&
    MUTATION_SYMBOL in value &&
    value[MUTATION_SYMBOL] === "mutation"
  );
}

export function mutation<F extends AnyFunction>(handler: F): Mutation<F> {
  const mutationFunction: Mutation<F> = async (...args: Parameters<F>) => {
    return handler(...args) as Promise<ReturnType<F>>;
  };

  mutationFunction[MUTATION_SYMBOL] = "mutation";

  return mutationFunction;
}
