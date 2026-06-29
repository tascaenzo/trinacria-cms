import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import type { CacheService } from "../../cache/cache.service.js";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import {
  BlacklistedTokenRecordSchema,
  type BlacklistedTokenRecord
} from "../auth-blacklist.schemas.js";

const SETTINGS_ENTITY_NAME = "settings";
const BLACKLIST_KIND = "blacklist";
const CACHE_NAMESPACE = "blacklist";
const AUTH_CLEANUP_INTERVAL_KEY = "core-pack:auth:cleanup_interval_seconds";
const DEFAULT_CLEANUP_INTERVAL_SECONDS = 300;
const MIN_CLEANUP_INTERVAL_SECONDS = 30;
const MAX_CLEANUP_INTERVAL_SECONDS = 3600;

export class AuthBlacklistRepository {
  private scope?: PluginDbScope;
  private lastCleanupAtMs = 0;
  private cachedCleanupIntervalSeconds = DEFAULT_CLEANUP_INTERVAL_SECONDS;
  private cachedCleanupIntervalLoadedAtMs = 0;

  constructor(
    private readonly db: DbAdapter,
    private readonly cache?: CacheService
  ) {}

  async add(
    sub: string,
    iat: number,
    tokenKind: "access" | "refresh",
    expiresAt: string
  ): Promise<void> {
    await this.maybeCleanupExpired();
    const key = `${sub.trim()}:${iat}`;
    await this.repository().insertOne({
      kind: BLACKLIST_KIND,
      key,
      sub: sub.trim(),
      iat,
      tokenKind,
      expiresAt,
      createdAt: new Date().toISOString()
    });
    const ttl = Math.max(1, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    await this.cache?.set(CACHE_NAMESPACE, key, true, ttl);
  }

  async isBlacklisted(sub: string, iat: number): Promise<boolean> {
    await this.maybeCleanupExpired();
    const key = `${sub.trim()}:${iat}`;
    const cached = await this.cache?.get<boolean>(CACHE_NAMESPACE, key);
    if (cached !== undefined) return cached;
    const found = await this.repository().findOne({
      filter: { kind: BLACKLIST_KIND, key }
    });
    const blacklisted = found !== null;
    if (blacklisted) {
      const ttl = Math.max(
        1,
        Math.floor((new Date(found.expiresAt).getTime() - Date.now()) / 1000)
      );
      await this.cache?.set(CACHE_NAMESPACE, key, true, ttl);
    }
    return blacklisted;
  }

  async cleanupExpired(): Promise<number> {
    const all = await this.repository().findMany({
      filter: { kind: BLACKLIST_KIND }
    });
    const now = new Date().toISOString();
    let removed = 0;
    for (const raw of all) {
      const record = BlacklistedTokenRecordSchema.parse(raw);
      if (record.expiresAt <= now) {
        await this.repository().deleteOne({ filter: { id: record.id } });
        await this.cache?.invalidate(CACHE_NAMESPACE, record.key);
        removed++;
      }
    }
    return removed;
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<BlacklistedTokenRecord>(SETTINGS_ENTITY_NAME);
  }

  private async maybeCleanupExpired(): Promise<void> {
    const intervalSeconds = await this.readCleanupIntervalSeconds();
    const nowMs = Date.now();
    if (nowMs - this.lastCleanupAtMs < intervalSeconds * 1000) return;
    this.lastCleanupAtMs = nowMs;
    await this.cleanupExpired();
  }

  private async readCleanupIntervalSeconds(): Promise<number> {
    const nowMs = Date.now();
    if (nowMs - this.cachedCleanupIntervalLoadedAtMs < 60_000) {
      return this.cachedCleanupIntervalSeconds;
    }
    this.cachedCleanupIntervalLoadedAtMs = nowMs;
    try {
      const repo = this.db.repository(SETTINGS_ENTITY_NAME, { pluginId: CORE_PACK_PLUGIN_ID });
      const valueRecord = await repo.findOne({
        filter: { kind: "value", key: AUTH_CLEANUP_INTERVAL_KEY }
      });
      const raw = (valueRecord as Record<string, unknown> | null)?.value;
      if (typeof raw === "number" && Number.isFinite(raw)) {
        this.cachedCleanupIntervalSeconds = clampCleanupInterval(raw);
        return this.cachedCleanupIntervalSeconds;
      }
      const defRecord = await repo.findOne({
        filter: { kind: "definition", key: AUTH_CLEANUP_INTERVAL_KEY }
      });
      const fallbackRaw = (defRecord as Record<string, unknown> | null)?.defaultValue;
      if (typeof fallbackRaw === "number" && Number.isFinite(fallbackRaw)) {
        this.cachedCleanupIntervalSeconds = clampCleanupInterval(fallbackRaw);
        return this.cachedCleanupIntervalSeconds;
      }
    } catch {
      // Settings may not be available during early bootstrap.
    }
    this.cachedCleanupIntervalSeconds = DEFAULT_CLEANUP_INTERVAL_SECONDS;
    return this.cachedCleanupIntervalSeconds;
  }
}

function clampCleanupInterval(input: number): number {
  const rounded = Math.floor(input);
  if (rounded < MIN_CLEANUP_INTERVAL_SECONDS) return MIN_CLEANUP_INTERVAL_SECONDS;
  if (rounded > MAX_CLEANUP_INTERVAL_SECONDS) return MAX_CLEANUP_INTERVAL_SECONDS;
  return rounded;
}
