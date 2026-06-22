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
  if (field.kind === "tags") {
    return "tag-1";
  }
  if (field.kind === "secret") {
    return "••••••";
  }
  return field.primary ? `Sample ${field.label}` : "-";
}

export function getRecordKey(record: unknown, index: number): string {
  return getRecordIdentity(record) ?? String(index);
}

export function getRecordIdentity(record: unknown): string | undefined {
  if (isObject(record)) {
    const id = record.id ?? record.key ?? record.slug;
    if (typeof id === "string" || typeof id === "number") {
      return String(id);
    }
  }
  return undefined;
}

export function humanizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (character) => character.toUpperCase());
}
