import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { createMongoDbAdapter, EntityRegistry, registerPlatformEntities } from "@trinacria-cms/kernel/runtime";
import { SettingsService } from "../src/modules/settings/services/settings.service.js";
import { createOwnedSettingsHost } from "../src/modules/settings/services/owned-settings-host.js";
import { SettingsDefinitionsRepository } from "../src/modules/settings/definitions/settings-definitions.repository.js";
import { SettingsValuesRepository } from "../src/modules/settings/values/settings-values.repository.js";
import { SettingsSecretsRepository } from "../src/modules/settings/secrets/settings-secrets.repository.js";
import { SettingsSecretsCryptoService } from "../src/modules/settings/secrets/settings-secrets-crypto.service.js";
import { SETTINGS_ENTITY } from "../src/modules/settings/schemas/settings.schemas.js";
const key = "owned-plugin:config:prefix";
const runtime = () => ({ list: () => [{ state: "loaded", manifest: { id: "owned-plugin", settings: [{ key, mutable: true }, { key: "owned-plugin:config:secret", secret: true }, { key: "owned-plugin:config:fixed", mutable: false }] } }] } as never);
test("owned settings capability rejects foreign, undeclared, secret and immutable keys before domain access", async () => {
 let reads = 0, writes = 0;
 const host = createOwnedSettingsHost({ async getResolvedValueForPlugin() { reads++; return { value: "prefix" }; }, async upsertValue() { writes++; } } as never, {} as never, runtime());
 assert.equal(await host.get("owned-plugin", key), "prefix");
 for (const wrong of ["other-plugin:config:prefix", "owned-plugin:config:unknown", "owned-plugin:config:secret"]) await assert.rejects(host.get("owned-plugin", wrong));
 await assert.rejects(host.set("owned-plugin", "owned-plugin:config:fixed", "new"));
 assert.equal(reads, 1); assert.equal(writes, 0);
});
test("owned settings write includes the source owner in the same host transaction fence", { skip: process.env.TRINACRIA_RUN_MONGO_INTEGRATION !== "1" }, async () => {
 const connection = await mongoose.createConnection("mongodb://trinacria:trinacria@127.0.0.1:27017/?authSource=admin", { dbName: `trinacria_owned_settings_${Date.now()}` }).asPromise();
 const registry = new EntityRegistry(); registerPlatformEntities(registry); registry.register(SETTINGS_ENTITY);
 const db = createMongoDbAdapter({ connection, entityRegistry: registry });
 const settings = new SettingsService(new SettingsDefinitionsRepository(db), new SettingsValuesRepository(db), new SettingsSecretsRepository(db), new SettingsSecretsCryptoService({ masterKey: "integration-master-key", keyVersion: "v1" }));
 let disabled = false, fenced = 0;
 db.setWriteGuard(async (_r, namespaces) => { if (namespaces.some(n => n.pluginId === "owned-plugin")) { fenced++; if (disabled) throw new Error("source owner disabled"); } });
 const host = createOwnedSettingsHost(settings, db, runtime());
 try {
   await settings.upsertDefinition({ requesterPluginId: "owned-plugin", key, visibility: "admin", mutable: true, secret: false, defaultValue: "" });
   await host.set("owned-plugin", key, "saved"); assert.ok(fenced >= 2); assert.equal(await host.get("owned-plugin", key), "saved");
   disabled = true; await assert.rejects(host.set("owned-plugin", key, "leaked"), /source owner disabled/);
   assert.equal(await host.get("owned-plugin", key), "saved");
 } finally { await connection.dropDatabase(); await connection.close(); }
});

test("owned setting read rechecks the asynchronous runtime view after domain access", async () => {
 let state = "loaded";
 const records = () => [{ state, manifest: { id: "owned-plugin", settings: [{ key, mutable: true }] } }];
 const host = createOwnedSettingsHost({ async getResolvedValueForPlugin() { state = "unloaded"; return { value: "do not return" }; } } as never, {} as never, { async list() { return records() as never; } });
 await assert.rejects(host.get("owned-plugin", key), /active setting/);
});
