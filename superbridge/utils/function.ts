export function copyFunction<Args extends unknown[], Result>(
  fn: (...args: Args) => Result
) {
  return (...args: Args) => fn(...args);
}
