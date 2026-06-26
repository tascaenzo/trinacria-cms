import assert from "node:assert/strict";
import test from "node:test";
import {
  readDeclarativeFieldValue,
  readDeclarativeStatusLabel,
  readDeclarativeStatusTone
} from "../src/declarative/components/declarative-field-renderers.js";
import type { AdminResourceDefinition } from "../src/contracts.js";

const statusField: NonNullable<AdminResourceDefinition["fields"]>[number] = {
  key: "status",
  label: "Status",
  kind: "status"
};

test("readDeclarativeStatus helpers translate active and non-active status values", () => {
  const translate = (key: string) => key;

  assert.equal(readDeclarativeStatusTone({ status: "active" }, statusField), "success");
  assert.equal(readDeclarativeStatusTone({ status: "disabled" }, statusField), "warning");
  assert.equal(
    readDeclarativeStatusLabel({ status: "active" }, statusField, translate),
    "common.status.active"
  );
});

test("readDeclarativeFieldValue formats tag fields for compact previews", () => {
  const field: NonNullable<AdminResourceDefinition["fields"]>[number] = {
    key: "permissions",
    label: "Permissions",
    kind: "tags"
  };

  assert.equal(
    readDeclarativeFieldValue({ permissions: ["users.read", "roles.write"] }, field),
    "users.read, roles.write"
  );
  assert.equal(readDeclarativeFieldValue({ permissions: [] }, field), "-");
});
