const MUTATION_SYMBOL = Symbol("mutation");

export interface Mutation<
  Args extends unknown[] = unknown[],
  Result = unknown
> {
  (...args: Args): Promise<Result>;
  [MUTATION_SYMBOL]: "mutation";
}

export function getIsMutation<Args extends unknown[], Result>(
  value: unknown
): value is Mutation<Args, Result> {
  return (
    typeof value === "function" &&
    MUTATION_SYMBOL in value &&
    value[MUTATION_SYMBOL] === "mutation"
  );
}

export function mutation<Args extends unknown[], Result>(
  handler: (...args: Args) => Result
): Mutation<Args, Result> {
  const mutationFunction: Mutation<Args, Result> = async (...args: Args) => {
    return handler(...args);
  };

  mutationFunction[MUTATION_SYMBOL] = "mutation";

  return mutationFunction;
}
