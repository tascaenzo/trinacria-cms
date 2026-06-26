import type { DeclarativeAction } from "../types.js";
import { readObjectPath } from "./object-path.js";

export function isDeclarativeActionVisibleForRecord(
  action: DeclarativeAction,
  record: unknown
): boolean {
  const guards = action.recordGuards ?? [];
  if (guards.length === 0) {
    return true;
  }
  if (record === undefined || record === null) {
    return false;
  }

  return guards.every((guard) => {
    const actual = normalizeGuardValue(readObjectPath(record, guard.field));
    const values = guard.values?.map((value) => normalizeGuardValue(value));
    const expected = normalizeGuardValue(guard.value);

    if (guard.operator === "equals") {
      return actual === expected;
    }
    if (guard.operator === "notEquals") {
      return actual !== expected;
    }
    if (guard.operator === "in") {
      return Boolean(values?.includes(actual));
    }
    if (guard.operator === "notIn") {
      return !values?.includes(actual);
    }
    return true;
  });
}

function normalizeGuardValue(value: unknown): string | number | boolean | null | undefined {
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  return undefined;
}
