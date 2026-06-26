import assert from "node:assert/strict";
import test from "node:test";
import { CmsSdkHttpError } from "@trinacria-cms/sdk";
import { getSdkErrorDetails, toDisplayError } from "../src/lib/sdk-errors.js";

test("getSdkErrorDetails extracts code and message from SDK error envelope", () => {
  const error = new CmsSdkHttpError({
    status: 403,
    data: { error: { code: "settings_access_denied", message: "Actor not authorized" } },
    headers: {},
    method: "GET",
    url: "/v1/settings/values"
  });
  const details = getSdkErrorDetails(error);
  assert.equal(details.status, 403);
  assert.equal(details.code, "settings_access_denied");
  assert.equal(details.message, "Actor not authorized");
});

test("getSdkErrorDetails handles missing envelope gracefully", () => {
  const error = new CmsSdkHttpError({
    status: 500,
    data: {},
    headers: {},
    method: "GET",
    url: "/v1/test"
  });
  const details = getSdkErrorDetails(error);
  assert.equal(details.status, 500);
  assert.equal(details.code, null);
  assert.equal(details.message, "HTTP 500");
});

test("getSdkErrorDetails handles generic Error instances", () => {
  const details = getSdkErrorDetails(new Error("Network failure"));
  assert.equal(details.status, undefined);
  assert.equal(details.code, null);
  assert.equal(details.message, "Network failure");
});

test("getSdkErrorDetails handles non-Error throwables", () => {
  const details = getSdkErrorDetails("raw string");
  assert.equal(details.status, undefined);
  assert.equal(details.code, null);
  assert.equal(details.message, "Unexpected backoffice error");
});

test("getSdkErrorDetails handles nullish input", () => {
  const details = getSdkErrorDetails(null);
  assert.equal(details.status, undefined);
  assert.equal(details.code, null);
  assert.equal(details.message, "Unexpected backoffice error");
});

test("getSdkErrorDetails extracts details from envelope", () => {
  const error = new CmsSdkHttpError({
    status: 400,
    data: {
      error: { code: "validation_error", message: "Invalid input", details: { field: "email" } }
    },
    headers: {},
    method: "POST",
    url: "/v1/settings/values"
  });
  const details = getSdkErrorDetails(error);
  assert.deepEqual(details.details, { field: "email" });
});

test("toDisplayError returns the message from SDK error", () => {
  const error = new CmsSdkHttpError({
    status: 403,
    data: { error: { code: "auth_invalid_credentials", message: "Invalid email or password" } },
    headers: {},
    method: "POST",
    url: "/v1/auth/login"
  });
  assert.equal(toDisplayError(error), "Invalid email or password");
});

test("toDisplayError falls back for unknown errors", () => {
  assert.equal(toDisplayError(null), "Unexpected backoffice error");
  assert.equal(toDisplayError(undefined), "Unexpected backoffice error");
});
