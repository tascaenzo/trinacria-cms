import assert from "node:assert/strict";
import test from "node:test";
import {
  isPermissionOwnedByPlugin,
  isPermissionPatternOwnedByPlugin,
  isValidPermissionKey,
  isValidPermissionPattern,
  matchesPermissionPattern,
  parsePermissionKey,
  parsePermissionPattern
} from "../src/runtime/permission-key.js";

test("permission key parser validates canonical keys", () => {
  const parsed = parsePermissionKey("core-pack:users:read");
  assert.ok(parsed);
  assert.equal(parsed.pluginId, "core-pack");
  assert.equal(parsed.resource, "users");
  assert.equal(parsed.action, "read");
  assert.equal(isValidPermissionKey("core-pack:users:read"), true);
  assert.equal(isValidPermissionKey("users.read"), false);
});

test("permission pattern parser validates wildcard patterns", () => {
  const parsed = parsePermissionPattern("core-pack:users:*");
  assert.ok(parsed);
  assert.equal(parsed.pluginId, "core-pack");
  assert.equal(parsed.resourcePattern, "users");
  assert.equal(parsed.actionPattern, "*");
  assert.equal(isValidPermissionPattern("core-pack:users:*"), true);
  assert.equal(isValidPermissionPattern("core-pack:*:*"), true);
  assert.equal(isValidPermissionPattern("core-pack:*"), false);
});

test("permission ownership and pattern matching helpers work", () => {
  assert.equal(isPermissionOwnedByPlugin("core-pack", "core-pack:users:read"), true);
  assert.equal(isPermissionPatternOwnedByPlugin("core-pack", "core-pack:users:*"), true);
  assert.equal(matchesPermissionPattern("core-pack:users:*", "core-pack:users:write"), true);
  assert.equal(matchesPermissionPattern("core-pack:users:read", "core-pack:users:write"), false);
  assert.equal(matchesPermissionPattern("core-pack:*:*", "core-pack:settings:write"), true);
});
