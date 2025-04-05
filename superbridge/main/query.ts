const QUERY_SYMBOL = Symbol("query");

export interface Query<Args extends unknown[] = unknown[], Result = unknown> {
  (...args: Args): Promise<Result>;
  [QUERY_SYMBOL]: "query";
}

export function getIsQuery<Args extends unknown[], Result>(
  value: unknown
): value is Query<Args, Result> {
  return (
    typeof value === "function" &&
    QUERY_SYMBOL in value &&
    value[QUERY_SYMBOL] === "query"
  );
}

export function query<Args extends unknown[], Result>(
  handler: (...args: Args) => Result
): Query<Args, Result> {
  const queryFunction: Query<Args, Result> = async (...args: Args) => {
    return handler(...args);
  };

  queryFunction[QUERY_SYMBOL] = "query";

  return queryFunction;
}
