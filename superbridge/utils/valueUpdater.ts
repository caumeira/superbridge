export type ValueUpdater<T> = Partial<T> | ((current: T) => Partial<T>);

export function updateValue<T>(value: T, updater: ValueUpdater<T>): T {
  if (typeof updater === "function") {
    return { ...value, ...updater(value) };
  }

  return { ...value, ...updater };
}
