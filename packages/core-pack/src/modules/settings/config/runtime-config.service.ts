import type { DbAdapter } from "@trinacria-cms/kernel";
import { readCorePackSettingValue } from "./runtime-settings.js";

type Logger = {
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
};

export interface RuntimeConfigGetStringOptions {
  fallback?: string;

  envVar?: string;
}

export interface RuntimeConfigGetNumberOptions {
  fallback?: number;
  min?: number;
  max?: number;
  envVar?: string;
}

export interface RuntimeConfigGetBooleanOptions {
  fallback?: boolean;
  envVar?: string;
}

export interface RuntimeConfigGetJsonOptions<T = unknown> {
  fallback?: T;
  envVar?: string;
}

const CACHE_TTL_MS = 30_000;

interface CacheEntry {
  value: unknown;
  loadedAt: number;
}

export class RuntimeConfigService {
  private cache = new Map<string, CacheEntry>();
  private strictMode = false;

  constructor(
    private readonly db: DbAdapter,
    private readonly logger?: Logger
  ) {}

  setStrictMode(enabled: boolean): void {
    this.strictMode = enabled;
  }

  async getString(key: string, opts?: RuntimeConfigGetStringOptions): Promise<string | undefined> {
    const cached = this.getFromCache<string>(key);
    if (cached !== undefined) return cached;

    const fromDb = await this.readFromDb(key);
    if (fromDb !== undefined && typeof fromDb === "string") {
      const trimmed = fromDb.trim();
      if (trimmed) {
        this.setCache(key, trimmed);
        return trimmed;
      }
    }

    const fromEnv = opts?.envVar ? this.readFromEnv(opts.envVar) : undefined;
    if (fromEnv !== undefined && typeof fromEnv === "string") {
      const trimmed = fromEnv.trim();
      if (trimmed) {
        this.warnEnvFallback(key, opts?.envVar!);
        this.setCache(key, trimmed);
        return trimmed;
      }
    }

    if (opts?.fallback !== undefined) {
      this.setCache(key, opts.fallback);
      return opts.fallback;
    }

    return undefined;
  }

  async getNumber(key: string, opts?: RuntimeConfigGetNumberOptions): Promise<number | undefined> {
    const cached = this.getFromCache<number>(key);
    if (cached !== undefined) return cached;

    const fromDb = await this.readFromDb(key);
    if (fromDb !== undefined && typeof fromDb === "number" && Number.isFinite(fromDb)) {
      const clamped = this.clampNumber(Math.floor(fromDb), opts?.min, opts?.max);
      this.setCache(key, clamped);
      return clamped;
    }

    const fromEnv = opts?.envVar ? this.readFromEnv(opts.envVar) : undefined;
    if (fromEnv !== undefined && typeof fromEnv === "number" && Number.isFinite(fromEnv)) {
      this.warnEnvFallback(key, opts?.envVar!);
      const clamped = this.clampNumber(Math.floor(fromEnv), opts?.min, opts?.max);
      this.setCache(key, clamped);
      return clamped;
    }

    if (opts?.fallback !== undefined) {
      const clamped = this.clampNumber(opts.fallback, opts?.min, opts?.max);
      this.setCache(key, clamped);
      return clamped;
    }

    return undefined;
  }

  async getBoolean(key: string, opts?: RuntimeConfigGetBooleanOptions): Promise<boolean | undefined> {
    const cached = this.getFromCache<boolean>(key);
    if (cached !== undefined) return cached;

    const fromDb = await this.readFromDb(key);
    if (fromDb !== undefined && typeof fromDb === "boolean") {
      this.setCache(key, fromDb);
      return fromDb;
    }

    const fromEnv = opts?.envVar ? this.readFromEnv(opts.envVar) : undefined;
    if (fromEnv !== undefined && typeof fromEnv === "boolean") {
      this.warnEnvFallback(key, opts?.envVar!);
      this.setCache(key, fromEnv);
      return fromEnv;
    }

    if (opts?.fallback !== undefined) {
      this.setCache(key, opts.fallback);
      return opts.fallback;
    }

    return undefined;
  }

  async getJson<T = unknown>(key: string, opts?: RuntimeConfigGetJsonOptions<T>): Promise<T | undefined> {
    const cached = this.getFromCache<T>(key);
    if (cached !== undefined) return cached;

    const fromDb = await this.readFromDb(key);
    if (fromDb !== undefined) {
      this.setCache(key, fromDb as T);
      return fromDb as T;
    }

    const fromEnv = opts?.envVar ? this.readFromEnv(opts.envVar) : undefined;
    if (fromEnv !== undefined) {
      this.warnEnvFallback(key, opts?.envVar!);
      this.setCache(key, fromEnv as T);
      return fromEnv as T;
    }

    if (opts?.fallback !== undefined) {
      this.setCache(key, opts.fallback as T);
      return opts.fallback;
    }

    return undefined;
  }

  invalidate(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  private getFromCache<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.loadedAt > CACHE_TTL_MS) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  private setCache(key: string, value: unknown): void {
    this.cache.set(key, { value, loadedAt: Date.now() });
  }

  private async readFromDb(key: string): Promise<unknown> {
    try {
      return await readCorePackSettingValue(this.db, key);
    } catch {
      return undefined;
    }
  }

  private readFromEnv(envVar: string): string | number | boolean | undefined {
    const raw = process.env[envVar]?.trim();
    if (raw === undefined || raw === "") return undefined;

    const lower = raw.toLowerCase();
    if (lower === "true" || lower === "1" || lower === "yes") return true;
    if (lower === "false" || lower === "0" || lower === "no") return false;

    const num = Number(raw);
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      if (raw.includes(".")) return num;
      return Math.floor(num);
    }

    return raw;
  }

  private clampNumber(value: number, min?: number, max?: number): number {
    if (min !== undefined && value < min) return min;
    if (max !== undefined && value > max) return max;
    return value;
  }

  private warnEnvFallback(key: string, envVar: string): void {
    const message = `RuntimeConfig: env fallback used for setting "${key}" via "${envVar}"`;
    if (this.strictMode) {
      throw new Error(`[STRICT MODE] ${message}`);
    }
    if (this.logger) {
      this.logger.warn(message);
    }
  }
}
