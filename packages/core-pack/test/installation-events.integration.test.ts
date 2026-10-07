import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import mongoose from "mongoose";
import {
  createMongoDbAdapter,
  EntityRegistry,
  MongoDurableEventStore,
  registerPlatformEntities,
} from "@trinacria-cms/kernel/runtime";
import { USERS_ENTITY } from "../src/modules/users/users.schemas.js";
import { UsersRepository } from "../src/modules/users/repositories/users.repository.js";
import { ROLES_ENTITY } from "../src/modules/roles/roles.schemas.js";
import { PERMISSIONS_ENTITY } from "../src/modules/permissions/permissions.schemas.js";
import { SETTINGS_ENTITY } from "../src/modules/settings/schemas/settings.schemas.js";
import { LOCAL_CREDENTIALS_ENTITY } from "../src/modules/installation/installation.schemas.js";
import { SettingsValuesRepository } from "../src/modules/settings/values/settings-values.repository.js";
import { createInstallationRuntime } from "./_shared/installation-runtime.js";

const enabled = process.env.TRINACRIA_RUN_MONGO_INTEGRATION === "1";
test("installer rolls back required configuration, fences concurrent attempts and resumes without duplicate users or events", {
  skip: !enabled,
}, async () => {
  const connection = await mongoose
    .createConnection("mongodb://trinacria:trinacria@127.0.0.1:27017/?authSource=admin", {
      dbName: `trinacria_install_events_${randomUUID().replaceAll("-", "")}`,
    })
    .asPromise();
  const registry = new EntityRegistry();
  registerPlatformEntities(registry);
  for (const entity of [
    USERS_ENTITY,
    ROLES_ENTITY,
    PERMISSIONS_ENTITY,
    SETTINGS_ENTITY,
    LOCAL_CREDENTIALS_ENTITY,
  ])
    registry.register(entity);
  const db = createMongoDbAdapter({ connection, entityRegistry: registry });
  let failOutbox = true,
    failSettings = false,
    failHook = true,
    failVerification = false;
  let releaseHook: (() => void) | undefined, hookEntered: (() => void) | undefined;
  let hookGate: Promise<void> | undefined;
  const store = new MongoDurableEventStore(
    db,
    registry,
    {
      async describe(ownerPluginId, eventName, payload) {
        if (failOutbox) throw new Error("outbox unavailable");
        return { ownerPluginId, eventName, payloadVersion: 1, payload, recipients: [] };
      },
      async dispatch() {
        throw new Error("No installation consumer declared");
      },
    },
    { instanceId: "installation-test" },
  );
  const host = {
    inspect: async () => ({ checks: [] }),
    async initialize() {
      if (failHook) throw new Error("Demo interrupted");
      hookEntered?.();
      await hookGate;
    },
    verify: async () => [
      {
        id: "services" as const,
        status: failVerification ? ("fail" as const) : ("pass" as const),
        message: "services-ready",
      },
    ],
  };
  const runtime = createInstallationRuntime(db, undefined, host, store);
  const other = createInstallationRuntime(db, undefined, host, store);
  const users = new UsersRepository(db);
  const input = {
    email: "admin@integration.example.test",
    firstName: "Admin",
    lastName: "Test",
    password: "Example123!",
    confirmPassword: "Example123!",
    siteName: "Installer integration",
    dataMode: "demo" as const,
  };
  const originalUpsert = SettingsValuesRepository.prototype.upsert;
  SettingsValuesRepository.prototype.upsert = async function (input) {
    if (failSettings && input.key === "core-pack:site:name")
      throw new Error("settings unavailable");
    return originalUpsert.call(this, input);
  };
  const outbox = () => db.repository("event_outbox", { pluginId: "kernel" }).findMany({});
  try {
    await store.initialize();
    await db.ensureIndexes("core-pack", [
      "users",
      "roles",
      "permissions",
      "settings",
      "local_credentials",
    ]);
    await assert.rejects(runtime.service.bootstrap(input), /outbox unavailable/);
    assert.equal(await users.findByEmail(input.email), null);
    assert.equal((await outbox()).length, 0);
    failOutbox = false;
    failSettings = true;
    await assert.rejects(runtime.service.bootstrap(input), /settings unavailable/);
    assert.equal(await users.findByEmail(input.email), null);
    assert.equal((await outbox()).length, 0);
    assert.equal(
      (await db.repository("local_credentials", { pluginId: "core-pack" }).findMany({})).length,
      0,
    );
    failSettings = false;
    await assert.rejects(runtime.service.bootstrap(input), /Demo interrupted/);
    const pending = await runtime.installationState.get();
    assert.equal(pending?.installed, false);
    assert.equal(pending?.phase, "content");
    await assert.rejects(
      other.service.bootstrap({
        ...input,
        password: "Takeover123!",
        confirmPassword: "Takeover123!",
      }),
      { code: "installation_resume_mismatch" },
    );
    failHook = false;
    failVerification = true;
    await assert.rejects(other.service.bootstrap(input), { code: "platform_maintenance" });
    assert.equal((await runtime.service.getStatus()).phase, "verification");
    failVerification = false;
    hookGate = new Promise((resolve) => {
      releaseHook = resolve;
    });
    const entered = new Promise<void>((resolve) => {
      hookEntered = resolve;
    });
    const first = runtime.service.bootstrap(input);
    await entered;
    await assert.rejects(other.service.bootstrap(input), { code: "installation_in_progress" });
    releaseHook?.();
    const completed = await first;
    assert.equal(completed.status.installed, true);
    assert.equal(completed.status.phase, "complete");
    assert.equal(completed.adminUser.id, pending?.adminUserId);
    assert.equal((await outbox()).length, 1);
    assert.equal((await users.list({})).length, 1);
    assert.equal(
      (await db.repository("local_credentials", { pluginId: "core-pack" }).findMany({})).length,
      1,
    );
    assert.equal((await other.service.getStatus()).installed, true);
    await assert.rejects(other.service.bootstrap(input), {
      code: "installation_already_completed",
    });
  } finally {
    releaseHook?.();
    SettingsValuesRepository.prototype.upsert = originalUpsert;
    await store.close();
    await connection.dropDatabase();
    await connection.close();
  }
});
