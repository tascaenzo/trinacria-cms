import type { AdminEndpointBinding, AdminResourceFieldDefinition } from "../../contracts.js";
import { isObject } from "./object-path.js";

export function formatEndpoint(endpoint: Pick<AdminEndpointBinding, "method" | "path">): string {
  return `${endpoint.method ?? "GET"} ${endpoint.path}`;
}

export function formatCellValue(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function formatFieldPreview(field: AdminResourceFieldDefinition): string {
  if (field.kind === "status") {
    return "active";
  }
  if (field.kind === "datetime") {
    return "2026-06-05 12:00";
  }
  if (field.kind === "json") {
    return "{...}";
  }
  if (field.kind === "secret") {
    return "••••••";
  }
  return field.primary ? `Sample ${field.label}` : "-";
}

export function getRecordKey(record: unknown, index: number): string {
  if (isObject(record)) {
    const id = record.id ?? record.key ?? record.slug;
    if (typeof id === "string" || typeof id === "number") {
      return String(id);
    }
  }
  return String(index);
}

export function humanizeKey(key: string): string {
  return key
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (character) => character.toUpperCase());
}
