type ModuleCleanup = Record<string | symbol, VoidFunction>;

declare global {
  var $$moduleCleanup: ModuleCleanup;
}

globalThis.$$moduleCleanup = {};

export const $moduleCleanup = new Proxy({} as ModuleCleanup, {
  set(target, prop: string, value) {
    const existingCleanup = globalThis.$$moduleCleanup[prop];

    if (existingCleanup && typeof existingCleanup === "function") {
      existingCleanup();
    }

    globalThis.$$moduleCleanup[prop] = value;

    return true;
  },
});

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    for (const cleanup of Object.values(globalThis.$$moduleCleanup)) {
      cleanup();
    }
  });
}
