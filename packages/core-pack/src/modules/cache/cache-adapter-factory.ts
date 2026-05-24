import type { DbAdapter } from "@trinacria-cms/kernel";
import { Redis } from "ioredis";
import type { CacheAdapter } from "./adapters/cache-adapter.js";
import { MemoryCacheAdapter } from "./adapters/memory-cache-adapter.js";
import { RedisCacheAdapter } from "./adapters/redis-cache-adapter.js";
import { readCorePackSettingValue } from "../settings/runtime-settings.js";

const SETTINGS_ENTITY_NAME = "settings";

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
export async function createDefaultCacheAdapter(db: DbAdapter): Promise<CacheAdapter> {
  if (customAdapter) {
    return customAdapter;
  }

  const redisUrl = await readRedisUrlFromSettings(db);
  if (redisUrl) {
    const prefix = await readStringSetting(db, "core-pack:cache:redis_prefix", "trinacria");
    const maxRetriesPerRequest = await readIntSetting(
      db,
      "core-pack:cache:redis_max_retries_per_request",
      3,
      0
    );
    const retryMaxAttempts = await readIntSetting(
      db,
      "core-pack:cache:redis_retry_max_attempts",
      3,
      0
    );
    const retryBaseMs = await readIntSetting(db, "core-pack:cache:redis_retry_base_ms", 200, 10);
    const retryCapMs = await readIntSetting(db, "core-pack:cache:redis_retry_cap_ms", 2000, 50);

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

async function readRedisUrlFromSettings(db: DbAdapter): Promise<string | null> {
  try {
    const repo = db.repository(SETTINGS_ENTITY_NAME, { pluginId: "core-pack" });

    const valueRecord = await repo.findOne({
      filter: { kind: "value", key: "core-pack:cache:redis_url" }
    });
    if (valueRecord) {
      const url = ((valueRecord as Record<string, unknown>).value as string) ?? "";
      if (url.trim().length > 0) return url.trim();
    }

    const defRecord = await repo.findOne({
      filter: { kind: "definition", key: "core-pack:cache:redis_url" }
    });
    if (defRecord) {
      const url = ((defRecord as Record<string, unknown>).defaultValue as string) ?? "";
      if (url.trim().length > 0) return url.trim();
    }
  } catch {
    // Settings collection may not exist yet during first bootstrap.
    // Fall back to in-memory cache.
  }
  return null;
}

async function readIntSetting(
  db: DbAdapter,
  key: string,
  fallback: number,
  min: number
): Promise<number> {
  const raw = await readCorePackSettingValue(db, key);
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  const parsed = Math.floor(raw);
  return parsed >= min ? parsed : fallback;
}

async function readStringSetting(db: DbAdapter, key: string, fallback: string): Promise<string> {
  const raw = await readCorePackSettingValue(db, key);
  if (typeof raw !== "string") return fallback;
  const value = raw.trim();
  return value || fallback;
}
