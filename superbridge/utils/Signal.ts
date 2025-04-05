type Listener<T> = (value: T) => void;

type Cleanup = () => void;

const NO_VALUE = Symbol("NO_VALUE");

export class Signal<T> {
  private listeners = new Map<Symbol, Listener<T>>();
  private lastValue: T | typeof NO_VALUE = NO_VALUE;

  assertLastValue(error: Error | string) {
    if (this.lastValue === NO_VALUE) {
      throw typeof error === "string" ? new Error(error) : error;
    }

    return this.lastValue;
  }

  get hasLastValue() {
    return this.lastValue !== NO_VALUE;
  }

  get maybeLastValue() {
    return this.lastValue === NO_VALUE ? undefined : this.lastValue;
  }

  emit(value: T) {
    this.lastValue = value;

    const listeners = [...this.listeners.values()];

    for (const listener of listeners) {
      try {
        listener(value);
      } catch (error) {
        console.error(error);
      }
    }
  }

  subscribe(listener: Listener<T>) {
    const id = Symbol();

    this.listeners.set(id, listener);

    return () => {
      this.listeners.delete(id);
    };
  }

  subscribeWithCurrentValue(listener: Listener<T>) {
    if (this.lastValue !== NO_VALUE) {
      listener(this.lastValue);
    }

    return this.subscribe(listener);
  }

  effect(initializer: (value: T) => Cleanup) {
    let currentCleanup: Cleanup | undefined;

    const cancelSubscription = this.subscribeWithCurrentValue((value) => {
      if (currentCleanup) {
        currentCleanup();
      }

      currentCleanup = initializer(value);
    });

    return () => {
      cancelSubscription();

      if (currentCleanup) {
        currentCleanup();
      }
    };
  }
}
