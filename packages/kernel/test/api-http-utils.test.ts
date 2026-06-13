import assert from "node:assert/strict";
import test from "node:test";
import { ValidationError } from "@trinacria/schema";
import {
  createPluginApiResponder,
  getStatusCodeForApiError,
  parsePathParam,
  parseQueryNumber,
  serializeCookie,
  toApiErrorResponse
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
    details: { nonce: "abc" }
  });

  assert.equal(response.error.code, "plugin_auth_invalid_signature");
  assert.equal(response.error.message, "Invalid plugin request signature");
  assert.deepEqual(response.error.details, { nonce: "abc" });
});

test("getStatusCodeForApiError maps auth and installation codes to HTTP statuses", () => {
  assert.equal(getStatusCodeForApiError("auth_invalid_credentials"), 401);
  assert.equal(getStatusCodeForApiError("auth_forbidden_admin_required"), 403);
  assert.equal(getStatusCodeForApiError("installation_already_completed"), 409);
  assert.equal(getStatusCodeForApiError("not_found"), 404);
  assert.equal(getStatusCodeForApiError("validation_error"), 400);
  assert.equal(getStatusCodeForApiError("internal_error"), 500);
});

test("createPluginApiResponder.fromError returns HTTP 401 for invalid credentials", () => {
  const responder = createPluginApiResponder("core-pack");
  const result = responder.fromError({
    code: "auth_invalid_credentials",
    message: "Invalid credentials"
  });

  assert.equal(result.status, 401);
  assert.equal(result.body.error.code, "auth_invalid_credentials");
  assert.equal(result.body.error.message, "Invalid credentials");
  assert.equal(result.body.meta?.pluginId, "core-pack");
});

test("createPluginApiResponder.invalidRequest returns HTTP 400", () => {
  const responder = createPluginApiResponder("core-pack");
  const result = responder.invalidRequest("Missing user id");

  assert.equal(result.status, 400);
  assert.equal(result.body.error.code, "invalid_request");
  assert.equal(result.body.meta?.pluginId, "core-pack");
});

test("toApiErrorResponse exposes validation issues for schema errors", () => {
  const response = toApiErrorResponse(
    new ValidationError([
      { path: ["firstName"], message: "Expected string", code: "invalid_type" },
      { path: ["lastName"], message: "Expected string", code: "invalid_type" }
    ])
  );

  assert.equal(response.error.code, "validation_error");
  assert.match(response.error.message, /firstName: Expected string/);
  assert.match(response.error.message, /lastName: Expected string/);
  assert.deepEqual(response.error.details, {
    issues: [
      { path: ["firstName"], message: "Expected string", code: "invalid_type" },
      { path: ["lastName"], message: "Expected string", code: "invalid_type" }
    ]
  });
});

test("toApiErrorResponse maps generic errors to internal_error", () => {
  const response = toApiErrorResponse(new Error("database is down"));

  assert.equal(response.error.code, "internal_error");
  assert.equal(response.error.message, "Unexpected error");
});

test("serializeCookie does not force Secure unless requested", () => {
  assert.equal(serializeCookie("sid", "abc").includes("Secure"), false);
  assert.equal(serializeCookie("sid", "abc", { secure: true }).includes("Secure"), true);
});
