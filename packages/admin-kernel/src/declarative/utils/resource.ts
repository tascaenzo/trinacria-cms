import type { AdminResourceDefinition, AdminResourceFieldDefinition } from "../../contracts.js";
import { isObject, readObjectPath } from "./object-path.js";

export function getDisplayFields(
  resource: AdminResourceDefinition,
  surface: "table" | "form"
): readonly AdminResourceFieldDefinition[] {
  const fields = resource.fields ?? [];
  const visible = fields.filter((field) => field[surface]);
  return visible.length > 0 ? visible : fields;
}

export function extractRecordList(
  data: unknown,
  valuePath: string | undefined
): readonly unknown[] {
  const value = readObjectPath(data, valuePath);
  if (Array.isArray(value)) {
    return value;
  }
  if (isObject(value) && Array.isArray(value.data)) {
    return value.data;
  }
  if (isObject(value) && Array.isArray(value.items)) {
    return value.items;
  }
  if (isObject(value) && isObject(value.data) && Array.isArray(value.data.items)) {
    return value.data.items;
  }
  return [];
}
