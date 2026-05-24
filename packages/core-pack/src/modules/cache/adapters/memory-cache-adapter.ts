import type { CacheAdapter, CacheEntry } from "./cache-adapter.js";

function buildCacheKey(namespace: string, key: string): string {
  return `cache:${namespace}:${key}`;
}

export class MemoryCacheAdapter implements CacheAdapter {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  async get<T>(namespace: string, key: string): Promise<T | undefined> {
    const entry = this.store.get(buildCacheKey(namespace, key));
    if (!entry) return undefined;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(buildCacheKey(namespace, key));
      return undefined;
    }
    return entry.value as T;
  }

  async set<T>(namespace: string, key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.store.set(buildCacheKey(namespace, key), {
      value,
      expiresAt: ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : null
    });
  }

  async del(namespace: string, key: string): Promise<void> {
    this.store.delete(buildCacheKey(namespace, key));
  }

  async delNamespace(namespace: string): Promise<void> {
    const prefix = buildCacheKey(namespace, "");
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
