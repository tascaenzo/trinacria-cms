import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";
import test from "node:test";
import { Redis } from "ioredis";
import { RedisCacheAdapter } from "../src/modules/cache/adapters/redis-cache-adapter.js";

test(
  "Redis cache preserves JSON, TTL and namespace isolation against a real server",
  { skip: process.env.TRINACRIA_RUN_REDIS_INTEGRATION !== "1" },
  async () => {
    const redis = new Redis(process.env.TRINACRIA_REDIS_URI ?? "redis://127.0.0.1:6379", {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null
    });
    const prefix = `trinacria-dependency-test:${process.pid}:${Date.now()}`;
    const cache = new RedisCacheAdapter(redis, prefix);
    await redis.connect();
    try {
      assert.equal(await cache.get("missing", "key"), undefined);
      await cache.set("first", "one", { allowed: true, roles: ["editor"] });
      await cache.set("first", "two", 2);
      await cache.set("second", "one", "kept");
      assert.deepEqual(await cache.get("first", "one"), { allowed: true, roles: ["editor"] });
      await cache.del("first", "two");
      assert.equal(await cache.get("first", "two"), undefined);
      await cache.delNamespace("first");
      assert.equal(await cache.get("first", "one"), undefined);
      assert.equal(await cache.get("second", "one"), "kept");

      await cache.set("expiry", "key", "short-lived", 1);
      assert.equal(await cache.get("expiry", "key"), "short-lived");
      await setTimeout(1_100);
      assert.equal(await cache.get("expiry", "key"), undefined);
      await cache.clear();
      assert.equal(await cache.get("second", "one"), undefined);
      assert.deepEqual(await redis.keys(`${prefix}:*`), []);
    } finally {
      try {
        await cache.clear();
      } finally {
        await redis.quit();
      }
    }
  }
);
