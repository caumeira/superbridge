import { ValueUpdater, updateValue } from "../utils/valueUpdater";

import { Signal } from "../utils/Signal";

export class SharedValue<T> {
  private value: T;
  private updates: Signal<T> = new Signal();

  constructor(readonly initialValue: T) {
    this.value = initialValue;
  }

  getValue() {
    return this.value;
  }

  setValue(value: T) {
    this.value = value;
    this.updates.emit(value);
  }

  updateValue(updater: ValueUpdater<T>) {
    this.setValue(updateValue(this.value, updater));
  }

  watch(callback: (value: T) => void) {
    return this.updates.subscribe(callback);
  }
}

export function getIsSharedValue<T>(value: unknown): value is SharedValue<T> {
  if (!value || typeof value !== "object") {
    return false;
  }

  return value instanceof SharedValue;
}

export function sharedValue<T>(initialValue: T): SharedValue<T> {
  return new SharedValue(initialValue);
}
