import type { ContentTypeField } from "../editorial-admin.types.js";

export function hasDuplicateFieldKey(
  fields: readonly ContentTypeField[],
  key: string,
  originalKey?: string
) {
  return fields.some((field) => field.key === key && field.key !== originalKey);
}

export function upsertField(
  fields: readonly ContentTypeField[],
  field: ContentTypeField,
  originalKey?: string
) {
  return originalKey
    ? fields.map((current) => (current.key === originalKey ? field : current))
    : [...fields, field];
}

export function moveField(
  fields: readonly ContentTypeField[],
  key: string,
  direction: "up" | "down"
) {
  const currentIndex = fields.findIndex((field) => field.key === key);
  const destination = currentIndex + (direction === "up" ? -1 : 1);
  if (currentIndex < 0 || destination < 0 || destination >= fields.length) return fields;

  const next = [...fields];
  [next[currentIndex], next[destination]] = [next[destination]!, next[currentIndex]!];
  return next;
}
