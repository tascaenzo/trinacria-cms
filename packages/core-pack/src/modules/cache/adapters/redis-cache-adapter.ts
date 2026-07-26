import type { Redis } from "ioredis";
import type { CacheAdapter } from "./cache-adapter.js";

export class RedisCacheAdapter implements CacheAdapter {
  private readonly prefix: string;

  constructor(
    private readonly redis: Redis,
    prefix?: string
  ) {
    this.prefix = prefix ? `${prefix}:` : "";
  }

  async get<T>(namespace: string, key: string): Promise<T | undefined> {
    const raw = await this.redis.get(this.buildKey(namespace, key));
    if (raw === null) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  async set<T>(namespace: string, key: string, value: T, ttlSeconds?: number): Promise<void> {
    const cacheKey = this.buildKey(namespace, key);
    const serialized = JSON.stringify(value);
    if (ttlSeconds !== undefined && ttlSeconds > 0) {
      await this.redis.setex(cacheKey, ttlSeconds, serialized);
    } else {
      await this.redis.set(cacheKey, serialized);
    }
  }

  async del(namespace: string, key: string): Promise<void> {
    await this.redis.del(this.buildKey(namespace, key));
  }

  async delNamespace(namespace: string): Promise<void> {
    const pattern = `${this.buildKey(namespace, "")}*`;
    let cursor = "0";
    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      cursor = nextCursor;
    } while (cursor !== "0");
  }

  async clear(): Promise<void> {
    const pattern = `${this.prefix}cache:*`;
    let cursor = "0";
    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      cursor = nextCursor;
    } while (cursor !== "0");
  }

  private buildKey(namespace: string, key: string): string {
    return `${this.prefix}cache:${namespace}:${key}`;
  }
}
