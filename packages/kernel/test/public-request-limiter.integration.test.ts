import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import mongoose from "mongoose";
import { EntityRegistry, createMongoDbAdapter, registerPlatformEntities } from "../src/runtime/index.js";
import { PublicRequestLimiter, PublicRequestLimitedError } from "../src/runtime/persistence/public-request-limiter.js";

test("public request budget is atomic and shared by independent replicas with bounded TTL", { skip: process.env.TRINACRIA_RUN_MONGO_INTEGRATION !== "1" }, async () => {
  const connection = await mongoose.createConnection("mongodb://trinacria:trinacria@127.0.0.1:27017/?authSource=admin", { dbName: `trinacria_public_rate_${randomUUID().replaceAll("-", "")}` }).asPromise();
  try {
    const registry = new EntityRegistry(); registerPlatformEntities(registry);
    const db = createMongoDbAdapter({ connection, entityRegistry: registry });
    await db.ensureIndexes("kernel", ["public_request_limits"]);
    let now = 120000;
    const replicas = [new PublicRequestLimiter(db, () => now), new PublicRequestLimiter(db, () => now)];
    // First requests race on creation; later requests race on the same counter.
    for (let batch = 0; batch < 12; batch++) await Promise.all(Array.from({ length: 10 }, (_, index) => replicas[index % 2]!.consume("same-peer")));
    await assert.rejects(replicas[0]!.consume("same-peer"), PublicRequestLimitedError);
    await assert.rejects(replicas[1]!.consume("same-peer"), PublicRequestLimitedError);
    const rows = await db.repository("public_request_limits", { pluginId: "kernel" }).findMany({});
    assert.equal(rows.length, 1); assert.equal(rows[0]!.count, 120); assert.ok(rows[0]!.purgeAt instanceof Date);
    assert.ok(!JSON.stringify(rows).includes("same-peer"));
    now += 60000; await replicas[1]!.consume("same-peer"); await replicas[0]!.consume("different-peer");
    assert.equal((await db.repository("public_request_limits", { pluginId: "kernel" }).findMany({})).length, 3);
  } finally { await connection.dropDatabase(); await connection.close(); }
});
