type PropertiesMapValue = unknown | NestedRecord;

type NestedRecord = {
  [key: string]: PropertiesMapValue;
};

export type PropertiesMap<LeafType = unknown> = Map<string, LeafType>;

/**
 * Returns true only for plain, {} objects (not instances of classes, arrays, etc.)
 */
function getIsPlainObject(value: unknown): value is Record<string, unknown> {
  return value?.constructor === Object;
}

function getPath(currentPath: string, key: string) {
  if (!currentPath) return key;

  return `${currentPath}.${key}`;
}

function buildPropertiesMap<LeafType = unknown>(
  currentPath: string,
  result: PropertiesMap<LeafType>,
  input: NestedRecord
) {
  for (const [key, value] of Object.entries(input)) {
    const path = getPath(currentPath, key);

    if (getIsPlainObject(value)) {
      buildPropertiesMap(path, result, value);
    } else {
      result.set(path, value as LeafType);
    }
  }
}

export function createNestedRecordPropertiesMap<LeafType = unknown>(
  input: NestedRecord
): PropertiesMap<LeafType> {
  const map = new Map<string, LeafType>();

  buildPropertiesMap("", map, input);

  return map;
}

function innerMapNestedRecord(
  currentPath: string,
  input: NestedRecord,
  mapper: (value: unknown, path: string) => unknown
): NestedRecord {
  const result: NestedRecord = {};

  for (const [key, value] of Object.entries(input)) {
    const path = getPath(currentPath, key);

    if (getIsPlainObject(value)) {
      result[key] = innerMapNestedRecord(path, value, mapper);
    } else {
      result[key] = mapper(value, path);
    }
  }

  return result;
}

export function mapNestedRecord(
  input: NestedRecord,
  mapper: (value: unknown, path: string) => unknown
): NestedRecord {
  return innerMapNestedRecord("", input, mapper);
}

export function unwrapNestedRecord(
  pathMap: Map<string, unknown> | Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Convert to array of entries if input is a Map
  const entries =
    pathMap instanceof Map
      ? Array.from(pathMap.entries())
      : Object.entries(pathMap);

  for (const [path, value] of entries) {
    // Skip empty paths
    if (!path) continue;

    const keys = path.split(".");
    let current = result;

    // Navigate to the correct nesting level
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];

      // Create nested object if it doesn't exist
      if (!(key in current)) {
        current[key] = {};
      }

      // If the current value isn't an object, it will be overwritten
      if (typeof current[key] !== "object" || current[key] === null) {
        current[key] = {};
      }

      // Move to the next level
      current = current[key] as Record<string, unknown>;
    }

    // Set the value at the final key
    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
  }

  return result;
}
