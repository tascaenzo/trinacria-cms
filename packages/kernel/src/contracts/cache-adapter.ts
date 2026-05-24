export interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

export interface CacheAdapter {
  get<T>(namespace: string, key: string): Promise<T | undefined>;
  set<T>(namespace: string, key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(namespace: string, key: string): Promise<void>;
  delNamespace(namespace: string): Promise<void>;
  clear(): Promise<void>;
}
