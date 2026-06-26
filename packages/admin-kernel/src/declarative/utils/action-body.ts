import type { AdminEndpointBinding } from "../../contracts.js";
import type { DeclarativeActionContext } from "../types.js";
import { readObjectPath } from "./object-path.js";
import { createSchemaSample } from "./schema.js";

export function createDeclarativeActionDraftBody(
  action: {
    input?: { schema?: unknown; valuePath?: string };
    endpoint: AdminEndpointBinding;
  },
  context?: DeclarativeActionContext
): string {
  if (action.endpoint.method === "GET" || action.endpoint.method === "DELETE") {
    return "";
  }

  const draft = action.input?.valuePath
    ? readObjectPath(context?.record, action.input.valuePath)
    : createSchemaSample(action.input?.schema);
  if (draft === undefined) {
    return "";
  }

  return JSON.stringify(draft, null, 2);
}

export function parseActionBody(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

export function parseDraftBodyPreview(value: string): unknown {
  try {
    return parseActionBody(value);
  } catch {
    return undefined;
  }
}

export function resolveDeclarativeActionPathParams(
  path: string,
  body: unknown,
  record: unknown
): Record<string, string | number | boolean | null> | undefined {
  const names = Array.from(path.matchAll(/:([a-zA-Z0-9_]+)/g), (match) => match[1]);
  if (names.length === 0) {
    return undefined;
  }

  const params: Record<string, string | number | boolean | null> = {};
  for (const name of names) {
    const value = readObjectPath(body, name) ?? readObjectPath(record, name);
    if (isSdkPrimitive(value)) {
      params[name] = value;
    }
  }

  return params;
}

function isSdkPrimitive(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}
