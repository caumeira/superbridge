const QUERY_SYMBOL = Symbol("query");

type AnyFunction = (...args: any[]) => any;
export interface Query<F extends AnyFunction> {
  (...args: Parameters<F>): Promise<ReturnType<F>>;
  [QUERY_SYMBOL]: "query";
}

export function getIsQuery<F extends AnyFunction>(
  value: unknown
): value is Query<F> {
  return (
    typeof value === "function" &&
    QUERY_SYMBOL in value &&
    value[QUERY_SYMBOL] === "query"
  );
}

export function query<F extends AnyFunction>(handler: F): Query<F> {
  const queryFunction: Query<F> = async (...args: Parameters<F>) => {
    return handler(...args) as Promise<ReturnType<F>>;
  };

  queryFunction[QUERY_SYMBOL] = "query";

  return queryFunction;
}
