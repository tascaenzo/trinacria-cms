import assert from "node:assert/strict";
import test from "node:test";
import {
  createActionBodyFromFields,
  createInitialDraftFields,
  defaultDraftFieldValue,
  getActionFormFields
} from "../src/declarative/components/declarative-action-form.js";
import type { DeclarativeAction } from "../src/declarative/types.js";

const translate = (key: string, fallback?: string) => fallback ?? key;

test("getActionFormFields maps object schemas to editable field definitions", () => {
  const action: DeclarativeAction = {
    id: "update-role",
    intent: "update",
    title: "Edit",
    endpoint: { method: "PATCH", path: "/v1/roles/:id" },
    input: {
      schema: {
        type: "object",
        properties: {
          name: { type: "string", labelKey: "roles.form.name" },
          enabled: { type: "boolean" },
          limit: { type: "integer" },
          payload: { type: "object" },
          tags: { type: "array", items: { type: "string", enum: ["a", "b"] } }
        },
        required: ["name", "limit"]
      }
    }
  };

  const fields = getActionFormFields(action, translate);

  assert.deepEqual(
    fields.map((field) => [field.key, field.kind, field.required]),
    [
      ["name", "text", true],
      ["enabled", "boolean", false],
      ["limit", "number", true],
      ["payload", "json", false],
      ["tags", "stringArray", false]
    ]
  );
  assert.deepEqual(fields.find((field) => field.key === "tags")?.options, [
    { value: "a", label: "a" },
    { value: "b", label: "b" }
  ]);
});

test("createInitialDraftFields hydrates draft values from record data", () => {
  const action: DeclarativeAction = {
    id: "update-record",
    intent: "update",
    title: "Edit",
    endpoint: { method: "PATCH", path: "/v1/items/:id" },
    input: {
      schema: {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
          count: { type: "number" },
          tags: { type: "array", items: { type: "string" } },
          payload: { type: "object" }
        }
      }
    }
  };

  const draft = createInitialDraftFields(action, {
    record: {
      enabled: true,
      count: 3,
      tags: ["alpha", "beta"],
      payload: { nested: true }
    }
  });

  assert.deepEqual(draft, {
    enabled: true,
    count: "3",
    tags: ["alpha", "beta"],
    payload: JSON.stringify({ nested: true }, null, 2)
  });
});

test("createActionBodyFromFields parses draft values by field kind", () => {
  const action: DeclarativeAction = {
    id: "create-item",
    intent: "create",
    title: "Create",
    endpoint: { method: "POST", path: "/v1/items" },
    input: {
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          enabled: { type: "boolean" },
          count: { type: "number" },
          tags: { type: "array", items: { type: "string" } },
          payload: { type: "object" },
          optional: { type: "string" }
        },
        required: ["name"]
      }
    }
  };

  const body = createActionBodyFromFields(action, {
    name: "Demo",
    enabled: true,
    count: "12",
    tags: ["alpha"],
    payload: '{"ok":true}',
    optional: ""
  });

  assert.deepEqual(body, {
    name: "Demo",
    enabled: true,
    count: 12,
    tags: ["alpha"],
    payload: { ok: true }
  });
});

test("defaultDraftFieldValue returns stable empty values per kind", () => {
  const action: DeclarativeAction = {
    id: "defaults",
    title: "Defaults",
    endpoint: { method: "POST", path: "/v1/defaults" },
    input: {
      schema: {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
          tags: { type: "array", items: { type: "string" } },
          name: { type: "string" }
        }
      }
    }
  };

  const fields = getActionFormFields(action);

  assert.equal(defaultDraftFieldValue(fields[0]!), false);
  assert.deepEqual(defaultDraftFieldValue(fields[1]!), []);
  assert.equal(defaultDraftFieldValue(fields[2]!), "");
});
