/**
 * Recursive JSON value model used by flexible settings payloads.
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

/**
 * Runtime guard validating a value as JSON-compatible payload.
 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) => isJsonValue(item));
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.entries(value as Record<string, unknown>).every(
    ([key, item]) =>
      key !== "__proto__" && key !== "prototype" && key !== "constructor" && isJsonValue(item)
  );
}

/**
 * Validates and returns a normalized JSON-compatible payload.
 */
export function parseJsonValue(value: unknown): JsonValue {
  if (!isJsonValue(value)) {
    throw new Error("Setting payload must be valid JSON-compatible value");
  }
  return cloneJsonValue(value);
}

/**
 * Performs a deep clone preserving JSON semantics.
 */
export function cloneJsonValue<T extends JsonValue>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
