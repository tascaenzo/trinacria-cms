import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import {
  BlacklistedTokenRecordSchema,
  type BlacklistedTokenRecord
} from "./auth-blacklist.schemas.js";

const BLACKLISTED_TOKENS_ENTITY_NAME = "blacklisted_tokens";
const SETTINGS_ENTITY_NAME = "settings";
const AUTH_CLEANUP_INTERVAL_KEY = "core-pack:auth:cleanup_interval_seconds";
const DEFAULT_CLEANUP_INTERVAL_SECONDS = 300;
const MIN_CLEANUP_INTERVAL_SECONDS = 30;
const MAX_CLEANUP_INTERVAL_SECONDS = 3600;

export class AuthBlacklistRepository {
  private scope?: PluginDbScope;
  private lastCleanupAtMs = 0;
  private cachedCleanupIntervalSeconds = DEFAULT_CLEANUP_INTERVAL_SECONDS;
  private cachedCleanupIntervalLoadedAtMs = 0;

  constructor(private readonly db: DbAdapter) {}

  async add(sub: string, iat: number, kind: "access" | "refresh", expiresAt: string): Promise<void> {
    await this.maybeCleanupExpired();
    await this.repository().insertOne({
      sub: sub.trim(),
      iat,
      kind,
      expiresAt,
      createdAt: new Date().toISOString()
    });
  }

  async isBlacklisted(sub: string, iat: number): Promise<boolean> {
    await this.maybeCleanupExpired();
    const found = await this.repository().findOne({
      filter: { sub: sub.trim(), iat }
    });
    return found !== null;
  }

  async cleanupExpired(): Promise<number> {
    const all = await this.repository().findMany({});
    const now = new Date().toISOString();
    let removed = 0;
    for (const raw of all) {
      const record = BlacklistedTokenRecordSchema.parse(raw);
      if (record.expiresAt <= now) {
        await this.repository().deleteOne({ filter: { id: record.id } });
        removed++;
      }
    }
    return removed;
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<BlacklistedTokenRecord>(BLACKLISTED_TOKENS_ENTITY_NAME);
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
