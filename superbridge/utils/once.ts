export function once<T>(fn: (...args: any[]) => T): (...args: any[]) => T {
  let called = false;
  let result: T;

  return function (...args: any[]) {
    if (called) return result;

    called = true;
    result = fn(...args);

    return result;
  };
}
