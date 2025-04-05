export interface PromiseController<T> {
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

export function createControlledPromise<T>() {
  let controller: PromiseController<T> | undefined;

  const promise = new Promise<T>((_resolve, _reject) => {
    controller = {
      resolve: _resolve,
      reject: _reject,
    };
  });

  return [promise, controller!] as const;
}
