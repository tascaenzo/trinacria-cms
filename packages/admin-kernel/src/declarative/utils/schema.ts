import type { DeclarativeField } from "../types.js";
import { humanizeKey } from "./formatting.js";
import { isObject } from "./object-path.js";

export function createSchemaSample(schema: unknown): unknown {
  if (!isObject(schema)) {
    return undefined;
  }

  const type = typeof schema.type === "string" ? schema.type : undefined;
  if (type === "object" || isObject(schema.properties)) {
    const properties = isObject(schema.properties) ? schema.properties : {};
    return Object.fromEntries(
      Object.entries(properties).map(([key, definition]) => [key, createSchemaSample(definition)])
    );
  }
  if (type === "array") {
    return [];
  }
  if (type === "boolean") {
    return false;
  }
  if (type === "number" || type === "integer") {
    return 0;
  }
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0];
  }
  if ("default" in schema) {
    return schema.default;
  }
  return "";
}

export function inferFormFields(schema: unknown): readonly DeclarativeField[] {
  if (!isObject(schema)) {
    return [];
  }

  const properties = schema.properties;
  if (!isObject(properties)) {
    return [];
  }

  return Object.entries(properties).map(([key, definition]) => {
    const typedDefinition = isObject(definition) ? definition : {};
    const type = typeof typedDefinition.type === "string" ? typedDefinition.type : "string";
    const title =
      typeof typedDefinition.title === "string" ? typedDefinition.title : humanizeKey(key);

    return {
      key,
      label: title,
      kind:
        type === "number" || type === "integer"
          ? "number"
          : type === "boolean"
            ? "boolean"
            : type === "object" || type === "array"
              ? "json"
              : "text",
      placeholder: formatSchemaPlaceholder(type)
    };
  });
}

function formatSchemaPlaceholder(type: string): string {
  if (type === "boolean") {
    return "false";
  }
  if (type === "number" || type === "integer") {
    return "0";
  }
  if (type === "object") {
    return "{}";
  }
  if (type === "array") {
    return "[]";
  }
  return "";
}
