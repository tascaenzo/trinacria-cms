import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import mongoose from "mongoose";
import { createMongoDbAdapter, EntityRegistry, MongoDurableEventStore, registerPlatformEntities } from "@trinacria-cms/kernel/runtime";
import { USERS_ENTITY } from "../src/modules/users/users.schemas.js";
import { UsersRepository } from "../src/modules/users/repositories/users.repository.js";
import { InstallationService } from "../src/modules/installation/services/installation.service.js";

test("installation user mutation rolls back when outbox fails and commits one durable lifecycle intent", { skip: process.env.TRINACRIA_RUN_MONGO_INTEGRATION !== "1" }, async () => {
 const connection = await mongoose.createConnection("mongodb://trinacria:trinacria@127.0.0.1:27017/?authSource=admin", { dbName: `trinacria_install_events_${randomUUID().replaceAll("-", "")}` }).asPromise();
 const registry = new EntityRegistry(); registerPlatformEntities(registry); registry.register(USERS_ENTITY);
 const db = createMongoDbAdapter({ connection, entityRegistry: registry });
 let fail = true;
 const store = new MongoDurableEventStore(db, registry, {
   async describe(ownerPluginId, eventName, payload) {
     if (fail) throw new Error("outbox unavailable");
     return { ownerPluginId, eventName, payloadVersion: 1, payload, recipients: [] };
   }, async dispatch() { throw new Error("No installation consumer declared"); }
 }, { instanceId: "installation-test" });
 const input = { email: "admin@integration.example.test", firstName: "Admin", lastName: "Test", password: "Example123!", confirmPassword: "Example123!" };
 const users = new UsersRepository(db);
 const service = new InstallationService({ ensureCreated: async () => ({ installed: false }), markInstalled: async (adminUserId: string) => ({ installed: true, adminUserId }) } as never,
   { upsert: async () => {} } as never, users, { assignRoleToUser: async () => {} } as never,
   { provision: async () => {} } as never, { hashPassword: async () => ({ algorithm: "fixture", passwordHash: "fixture", passwordSalt: "fixture" }) } as never, {} as never, store);
 try {
   await store.initialize(); await db.ensureIndexes("core-pack", ["users"]);
   await assert.rejects(service.bootstrap(input), /outbox unavailable/);
   assert.equal(await users.findByEmail(input.email), null);
   assert.equal((await db.repository("event_outbox", { pluginId: "kernel" }).findMany({})).length, 0);
   fail = false; const created = await service.bootstrap(input);
   const outbox = await db.repository<{ payload: { userId: string }; eventName: string }>("event_outbox", { pluginId: "kernel" }).findMany({});
   assert.equal(outbox.length, 1); assert.equal(outbox[0].payload.userId, created.adminUser.id);
   assert.equal(outbox[0].eventName, "core-pack:user-created");
   // A retried bootstrap sees the same active user and emits no duplicate creation intent.
   assert.equal((await service.bootstrap(input)).adminUser.id, created.adminUser.id);
   assert.equal((await db.repository("event_outbox", { pluginId: "kernel" }).findMany({})).length, 1);
 } finally { await store.close(); await connection.dropDatabase(); await connection.close(); }
});
