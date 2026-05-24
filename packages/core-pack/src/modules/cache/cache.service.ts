import type { CacheAdapter } from "./adapters/cache-adapter.js";

/**
 * Namespace-aware cache service with automatic loading via getOrCompute.
 *
 * Every value is stored under a namespace to allow targeted invalidation
 * (e.g., invalidate all "permissions" entries without touching "roles").
 */
export class CacheService {
  constructor(private readonly adapter: CacheAdapter) {}

  async get<T>(namespace: string, key: string): Promise<T | undefined> {
    return this.adapter.get<T>(namespace, key);
  }

  async set<T>(namespace: string, key: string, value: T, ttlSeconds?: number): Promise<void> {
    return this.adapter.set(namespace, key, value, ttlSeconds);
  }

  async getOrCompute<T>(
    namespace: string,
    key: string,
    loader: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = await this.adapter.get<T>(namespace, key);
    if (cached !== undefined) return cached;

    const value = await loader();
    await this.adapter.set(namespace, key, value, ttlSeconds);
    return value;
  }

  async invalidate(namespace: string, key?: string): Promise<void> {
    if (key) {
      await this.adapter.del(namespace, key);
    } else {
      await this.adapter.delNamespace(namespace);
    }
  }

  async clear(): Promise<void> {
    await this.adapter.clear();
  }

  /**
   * Wraps a loader function with caching, returning a function
   * that checks the cache first before calling the original loader.
   */
  wrap<T>(
    namespace: string,
    key: string,
    loader: () => Promise<T>,
    ttlSeconds?: number
  ): () => Promise<T> {
    return () => this.getOrCompute(namespace, key, loader, ttlSeconds);
  }
}
