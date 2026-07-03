import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import type { CacheService } from "../../cache/services/cache.service.js";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import {
  LoginAttemptRecordSchema,
  type LoginAttemptRecord
} from "../auth-login-attempt.schemas.js";

const SETTINGS_ENTITY_NAME = "settings";
const LOGIN_ATTEMPT_KIND = "login_attempt";
const CACHE_NAMESPACE = "login_attempt";
const AUTH_CLEANUP_INTERVAL_KEY = "core-pack:auth:cleanup_interval_seconds";
const DEFAULT_CLEANUP_INTERVAL_SECONDS = 300;
const MIN_CLEANUP_INTERVAL_SECONDS = 30;
const MAX_CLEANUP_INTERVAL_SECONDS = 3600;

export interface LoginAttemptState {
  count: number;
  lockoutUntil: number;
}

export class AuthLoginAttemptRepository {
  private scope?: PluginDbScope;
  private lastCleanupAtMs = 0;
  private cachedCleanupIntervalSeconds = DEFAULT_CLEANUP_INTERVAL_SECONDS;
  private cachedCleanupIntervalLoadedAtMs = 0;

  constructor(
    private readonly db: DbAdapter,
    private readonly cache?: CacheService
  ) {}

  async findByEmail(email: string): Promise<LoginAttemptRecord | null> {
    await this.maybeCleanupExpired();
    const key = email.trim().toLowerCase();
    const cached = await this.cache?.get<LoginAttemptRecord>(CACHE_NAMESPACE, key);
    if (cached !== undefined) return cached;
    const found = await this.repository().findOne({
      filter: { kind: LOGIN_ATTEMPT_KIND, key },
      parse: (value: unknown) => LoginAttemptRecordSchema.parse(value)
    });
    if (found) {
      await this.cache?.set(CACHE_NAMESPACE, key, found);
    }
    return found;
  }

  async increment(
    email: string,
    maxAttempts: number,
    lockoutMinutes: number
  ): Promise<LoginAttemptState> {
    await this.maybeCleanupExpired();
    const key = email.trim().toLowerCase();
    const existing = await this.findByEmail(key);
    const now = new Date().toISOString();

    const count = (existing?.count ?? 0) + 1;
    let lockoutUntil: string | undefined;

    if (count >= maxAttempts) {
      const lockDate = new Date(Date.now() + lockoutMinutes * 60 * 1000);
      lockoutUntil = lockDate.toISOString();
    }

    if (!existing) {
      const record = await this.repository().insertOne({
        kind: LOGIN_ATTEMPT_KIND,
        key,
        email: key,
        count,
        ...(lockoutUntil ? { lockoutUntil } : {}),
        createdAt: now,
        updatedAt: now
      });
      const state = {
        count: record.count as number,
        lockoutUntil: lockoutUntil ? new Date(lockoutUntil).getTime() : 0
      };
      await this.cache?.set(CACHE_NAMESPACE, key, record);
      return state;
    }

    const updated = await this.repository().updateOne(
      { filter: { id: existing.id } },
      {
        count,
        ...(lockoutUntil !== undefined ? { lockoutUntil } : {}),
        updatedAt: now
      }
    );
    if (!updated) {
      throw new Error("Login attempt record disappeared during update");
    }
    const state = { count, lockoutUntil: lockoutUntil ? new Date(lockoutUntil).getTime() : 0 };
    await this.cache?.set(CACHE_NAMESPACE, key, updated);
    return state;
  }

  async reset(email: string): Promise<void> {
    await this.maybeCleanupExpired();
    const key = email.trim().toLowerCase();
    const existing = await this.findByEmail(key);
    if (existing) {
      await this.repository().deleteOne({ filter: { id: existing.id } });
    }
    await this.cache?.invalidate(CACHE_NAMESPACE, key);
  }

  async cleanupExpired(): Promise<number> {
    const all = await this.repository().findMany({
      filter: { kind: LOGIN_ATTEMPT_KIND }
    });
    const now = new Date().toISOString();
    let removed = 0;
    for (const raw of all) {
      const record = LoginAttemptRecordSchema.parse(raw);
      if (record.lockoutUntil && record.lockoutUntil <= now) {
        await this.repository().deleteOne({ filter: { id: record.id } });
        await this.cache?.invalidate(CACHE_NAMESPACE, record.key);
        removed++;
      }
    }
    return removed;
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<LoginAttemptRecord>(SETTINGS_ENTITY_NAME);
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
