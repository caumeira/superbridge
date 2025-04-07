type SingleCleanup = () => void;

class CleanupHolder {
  private cleanups = new Set<SingleCleanup>();

  add(cleanup: SingleCleanup) {
    this.cleanups.add(cleanup);

    return () => {
      this.cleanups.delete(cleanup);
    };
  }

  remove(cleanup: SingleCleanup) {
    this.cleanups.delete(cleanup);
  }

  set next(cleanup: SingleCleanup) {
    this.add(cleanup);
  }

  clean() {
    const cleanups = [...this.cleanups];

    this.cleanups.clear();

    for (const cleanup of cleanups) {
      cleanup();
    }
  }
}

export interface Cleanup extends CleanupHolder {
  (): void;
  holder: CleanupHolder;
}

const cleanupProxyHandler: ProxyHandler<Cleanup> = {
  get(target, prop, receiver) {
    const holder = target.holder;

    return Reflect.get(holder, prop, holder);
  },
  set(target, prop, value, receiver) {
    const holder = target.holder;

    return Reflect.set(holder, prop, value, holder);
  },
  apply(target, thisArg, argArray) {
    const holder = target.holder;

    return holder.clean();
  },
};

export function createCleanup() {
  const holder = new CleanupHolder();

  const clean: Cleanup = (() => {}) as Cleanup;
  clean.holder = holder;

  return new Proxy(clean, cleanupProxyHandler);
}
