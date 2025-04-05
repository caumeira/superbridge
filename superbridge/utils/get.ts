export function get<T>(path: string, object: Record<string, unknown>): T {
  const keys = path.split(".");

  let current: any = object;

  for (const key of keys) {
    current = current[key];
  }

  return current as T;
}
