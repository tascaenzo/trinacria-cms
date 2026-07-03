import assert from "node:assert/strict";
import test from "node:test";
import { MemoryCacheAdapter } from "../src/modules/cache/adapters/memory-cache-adapter.js";
import { CacheService } from "../src/modules/cache/services/cache.service.js";

test("CacheService stores and retrieves values by namespace", async () => {
  const cache = new CacheService(new MemoryCacheAdapter());

  await cache.set("permissions", "users:read", { allowed: true });
  const result = await cache.get("permissions", "users:read");
  assert.deepEqual(result, { allowed: true });
});

test("CacheService returns undefined for missing key", async () => {
  const cache = new CacheService(new MemoryCacheAdapter());
  const result = await cache.get("permissions", "nonexistent");
  assert.equal(result, undefined);
});

test("CacheService getOrCompute loads and caches", async () => {
  const cache = new CacheService(new MemoryCacheAdapter());
  let calls = 0;

  const result1 = await cache.getOrCompute("roles", "admin", async () => {
    calls++;
    return { code: "admin", name: "Administrator" };
  });

  const result2 = await cache.getOrCompute("roles", "admin", async () => {
    calls++;
    return { code: "admin", name: "Administrator" };
  });

  assert.equal(calls, 1);
  assert.deepEqual(result1, { code: "admin", name: "Administrator" });
  assert.deepEqual(result2, { code: "admin", name: "Administrator" });
});

test("CacheService invalidate by key", async () => {
  const cache = new CacheService(new MemoryCacheAdapter());

  await cache.set("permissions", "key1", "value1");
  await cache.set("permissions", "key2", "value2");

  await cache.invalidate("permissions", "key1");
  assert.equal(await cache.get("permissions", "key1"), undefined);
  assert.equal(await cache.get("permissions", "key2"), "value2");
});

test("CacheService invalidate entire namespace", async () => {
  const cache = new CacheService(new MemoryCacheAdapter());

  await cache.set("ns1", "a", 1);
  await cache.set("ns1", "b", 2);
  await cache.set("ns2", "c", 3);

  await cache.invalidate("ns1");
  assert.equal(await cache.get("ns1", "a"), undefined);
  assert.equal(await cache.get("ns1", "b"), undefined);
  assert.equal(await cache.get("ns2", "c"), 3);
});

test("CacheService clear removes everything", async () => {
  const cache = new CacheService(new MemoryCacheAdapter());

  await cache.set("ns1", "a", 1);
  await cache.set("ns2", "b", 2);
  await cache.clear();

  assert.equal(await cache.get("ns1", "a"), undefined);
  assert.equal(await cache.get("ns2", "b"), undefined);
});

test("CacheService TTL expires entries", async () => {
  const cache = new CacheService(new MemoryCacheAdapter());

  await cache.set("ttl", "key", "value", -1);
  const result = await cache.get("ttl", "key");
  assert.equal(result, undefined);
});

test("CacheService TTL=0 caches forever (no expiration)", async () => {
  const cache = new CacheService(new MemoryCacheAdapter());

  await cache.set("ttl-zero", "key", "value", 0);
  const result = await cache.get("ttl-zero", "key");
  assert.equal(result, "value");
});

test("CacheService wrap returns cached result", async () => {
  const cache = new CacheService(new MemoryCacheAdapter());
  let calls = 0;

  const loader = cache.wrap("ns", "key", async () => {
    calls++;
    return "computed";
  });

  assert.equal(await loader(), "computed");
  assert.equal(await loader(), "computed");
  assert.equal(calls, 1);
});
