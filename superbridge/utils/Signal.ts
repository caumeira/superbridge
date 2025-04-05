type Listener<T> = (value: T) => void;

export class Signal<T> {
  private listeners = new Map<Symbol, Listener<T>>();

  emit(value: T) {
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
}
