import type { DbAdapter } from "@trinacria-cms/kernel";
import { Redis } from "ioredis";
import type { RuntimeConfigService } from "../settings/config/runtime-config.service.js";
import type { CacheAdapter } from "./adapters/cache-adapter.js";
import { MemoryCacheAdapter } from "./adapters/memory-cache-adapter.js";
import { RedisCacheAdapter } from "./adapters/redis-cache-adapter.js";

/*
 * Global registry for custom cache adapters.
 * Call `setCustomCacheAdapter(adapter)` during bootstrap to override the default.
 */
let customAdapter: CacheAdapter | null = null;

export function setCustomCacheAdapter(adapter: CacheAdapter): void {
  customAdapter = adapter;
}

export function getCustomCacheAdapter(): CacheAdapter | null {
  return customAdapter;
}

/*
 * Default adapter factory.
 * Priority: custom adapter > Redis (from settings) > Memory.
 */
export async function createDefaultCacheAdapter(
  db: DbAdapter,
  config: RuntimeConfigService
): Promise<CacheAdapter> {
  if (customAdapter) {
    return customAdapter;
  }

  const redisUrl = await config.getString("core-pack:cache:redis_url");
  if (redisUrl) {
    const prefix =
      (await config.getString("core-pack:cache:redis_prefix", {
        fallback: "trinacria"
      })) ?? "trinacria";
    const maxRetriesPerRequest =
      (await config.getNumber("core-pack:cache:redis_max_retries_per_request", {
        fallback: 3,
        min: 0
      })) ?? 3;
    const retryMaxAttempts =
      (await config.getNumber("core-pack:cache:redis_retry_max_attempts", {
        fallback: 3,
        min: 0
      })) ?? 3;
    const retryBaseMs =
      (await config.getNumber("core-pack:cache:redis_retry_base_ms", {
        fallback: 200,
        min: 10
      })) ?? 200;
    const retryCapMs =
      (await config.getNumber("core-pack:cache:redis_retry_cap_ms", {
        fallback: 2000,
        min: 50
      })) ?? 2000;

    const redis = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest,
      retryStrategy(times) {
        if (times > retryMaxAttempts) return null;
        return Math.min(times * retryBaseMs, retryCapMs);
      }
    });
    return new RedisCacheAdapter(redis, prefix);
  }
  return new MemoryCacheAdapter();
}
