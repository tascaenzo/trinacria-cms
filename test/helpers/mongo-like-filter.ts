import { isDeepStrictEqual } from "node:util";

/** Test-only filter evaluator. Mongo integration tests verify the real CAS behavior. */
export function matchesMongoFilter(item: Record<string, unknown>, filter?: Record<string, unknown>): boolean {
  if (!filter) return true;
  return Object.entries(filter).every(([key, expected]) => {
    if (key === "$or") return (expected as Record<string, unknown>[]).some((branch) => matchesMongoFilter(item, branch));
    const actual = key.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, item);
    if (expected && typeof expected === "object" && !Array.isArray(expected) && !(expected instanceof Date)) {
      const predicate = expected as Record<string, unknown>;
      if ("$exists" in predicate && (actual !== undefined) !== predicate.$exists) return false;
      if ("$gt" in predicate && !(actual !== undefined && comparable(actual) > comparable(predicate.$gt))) return false;
      if ("$lte" in predicate && !(actual !== undefined && comparable(actual) <= comparable(predicate.$lte))) return false;
      if (Object.keys(predicate).some((name) => name.startsWith("$"))) return true;
    }
    return isDeepStrictEqual(actual, expected);
  });
}

function comparable(value: unknown): string | number { return value instanceof Date ? value.getTime() : typeof value === "number" || typeof value === "string" ? value : ""; }
