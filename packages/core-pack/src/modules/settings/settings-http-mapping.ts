import { parseJsonValue, type JsonValue } from "./settings-json.js";

/**
 * Reads an optional JSON payload field from raw body and validates it.
 */
export function readOptionalJsonField(
  body: unknown,
  field: string,
): JsonValue | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return undefined;
  }
  const raw = (body as Record<string, unknown>)[field];
  if (raw === undefined) return undefined;
  return parseJsonValue(raw);
}
