import assert from "node:assert/strict";
import test from "node:test";
import {
  parsePathParam,
  parseQueryNumber,
  toApiErrorResponse,
} from "../src/http/api-http-utils.js";

test("parseQueryNumber parses finite numeric values", () => {
  assert.equal(parseQueryNumber("10"), 10);
  assert.equal(parseQueryNumber(["3"]), 3);
  assert.equal(parseQueryNumber(undefined), undefined);
  assert.equal(parseQueryNumber(""), undefined);
  assert.equal(parseQueryNumber("not-a-number"), undefined);
});

test("parsePathParam resolves direct and case-insensitive keys", () => {
  assert.equal(parsePathParam({ roleCode: "admin" }, "roleCode"), "admin");
  assert.equal(parsePathParam({ rolecode: "editor" }, "roleCode"), "editor");
  assert.equal(parsePathParam({ ROLECODE: "viewer" }, "roleCode"), "viewer");
  assert.equal(parsePathParam({ id: "legacy" }, "roleCode", ["id"]), "legacy");
  assert.equal(parsePathParam({ id: "u1" }, "roleCode"), undefined);
  assert.equal(parsePathParam(undefined, "roleCode"), undefined);
});

test("toApiErrorResponse keeps explicit error code when present", () => {
  const response = toApiErrorResponse({
    code: "plugin_auth_invalid_signature",
    message: "Invalid plugin request signature",
    details: { nonce: "abc" },
  });

  assert.equal(response.error.code, "plugin_auth_invalid_signature");
  assert.equal(response.error.message, "Invalid plugin request signature");
  assert.deepEqual(response.error.details, { nonce: "abc" });
});
