import assert from "node:assert/strict";
import test from "node:test";
import { SettingRecordSchema } from "../src/modules/settings/schemas/settings.schemas.js";

test("SettingRecordSchema accepts core-pack internal records stored in settings", () => {
  const installState = SettingRecordSchema.parse({
    id: "core-pack:settings:install",
    kind: "install_state",
    key: "core-pack",
    installed: true,
    installedAt: "2026-06-15T10:00:00.000Z",
    adminUserId: "admin-1",
    createdAt: "2026-06-15T10:00:00.000Z",
    updatedAt: "2026-06-15T10:00:00.000Z"
  });

  const blacklistedToken = SettingRecordSchema.parse({
    id: "core-pack:settings:blacklist",
    kind: "blacklist",
    key: "user-1:123456",
    sub: "user-1",
    iat: 123456,
    tokenKind: "refresh",
    expiresAt: "2026-06-16T10:00:00.000Z",
    createdAt: "2026-06-15T10:00:00.000Z"
  });

  const loginAttempt = SettingRecordSchema.parse({
    id: "core-pack:settings:login-attempt",
    kind: "login_attempt",
    key: "admin@example.com",
    email: "ADMIN@example.com",
    count: 3,
    lockoutUntil: null,
    createdAt: "2026-06-15T10:00:00.000Z",
    updatedAt: "2026-06-15T10:00:00.000Z"
  });

  assert.equal(installState.kind, "install_state");
  assert.equal(blacklistedToken.kind, "blacklist");
  assert.equal(loginAttempt.email, "admin@example.com");
});
