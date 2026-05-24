import type { DbAdapter } from "@trinacria-cms/kernel";
import type { HttpContext } from "@trinacria-cms/kernel";
import type { PluginAuthKeyProvider } from "./settings-plugin-auth-key-provider.js";
import { readCorePackSettingValue } from "../runtime-settings.js";
import {
  buildPluginRequestSignature,
  normalizePath,
  PLUGIN_AUTH_HEADERS,
  signaturesEqual
} from "./settings-plugin-auth.js";

export interface SettingsPluginAuthServiceOptions {
  maxSkewSeconds?: number;
}

/**
 * Typed authentication error used by settings endpoints.
 */
export class SettingsPluginAuthError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "SettingsPluginAuthError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Validates signed plugin caller headers and prevents short-window replays.
 */
export class SettingsPluginAuthService {
  private readonly envMaxSkewSeconds: number;
  private readonly usedNonces = new Map<string, number>();
  private configCache?: {
    loadedAtMs: number;
    maxSkewSeconds: number;
    nonceCacheMaxEntries: number;
  };

  constructor(
    private readonly keyProvider: PluginAuthKeyProvider,
    dbOrOptions?: DbAdapter | SettingsPluginAuthServiceOptions,
    options?: SettingsPluginAuthServiceOptions
  ) {
    const maybeDb = dbOrOptions as DbAdapter | undefined;
    const resolvedOptions =
      dbOrOptions && typeof dbOrOptions === "object" && "repository" in dbOrOptions
        ? options
        : (dbOrOptions as SettingsPluginAuthServiceOptions | undefined);

    this.db =
      maybeDb && typeof maybeDb === "object" && "repository" in maybeDb ? maybeDb : null;
    this.envMaxSkewSeconds = resolvedOptions?.maxSkewSeconds ?? readMaxSkewFromEnv();
  }
  private readonly db: DbAdapter | null;

  async authenticateRequest(ctx: HttpContext): Promise<string> {
    const config = await this.getConfig();
    const pluginId = this.getHeader(ctx, PLUGIN_AUTH_HEADERS.pluginId)?.trim().toLowerCase();
    const timestampRaw = this.getHeader(ctx, PLUGIN_AUTH_HEADERS.timestamp)?.trim();
    const nonce = this.getHeader(ctx, PLUGIN_AUTH_HEADERS.nonce)?.trim();
    const signature = this.getHeader(ctx, PLUGIN_AUTH_HEADERS.signature)?.trim().toLowerCase();

    if (!pluginId || !timestampRaw || !nonce || !signature) {
      throw new SettingsPluginAuthError(
        "plugin_auth_missing_headers",
        "Missing plugin authentication headers"
      );
    }

    const timestamp = Number.parseInt(timestampRaw, 10);
    if (!Number.isFinite(timestamp)) {
      throw new SettingsPluginAuthError(
        "plugin_auth_invalid_timestamp",
        "Invalid plugin auth timestamp"
      );
    }

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > config.maxSkewSeconds) {
      throw new SettingsPluginAuthError(
        "plugin_auth_timestamp_expired",
        "Plugin auth timestamp expired"
      );
    }

    const secret = await this.keyProvider.getSecret(pluginId);
    if (!secret) {
      throw new SettingsPluginAuthError(
        "plugin_auth_plugin_not_configured",
        `Plugin caller "${pluginId}" is not configured`
      );
    }

    this.assertNonceNotReplayed(pluginId, nonce, now + config.maxSkewSeconds, config.nonceCacheMaxEntries);

    const request = toNodeRequest(ctx.req);
    const expected = buildPluginRequestSignature({
      pluginId,
      secret,
      method: request.method ?? "GET",
      path: normalizePath(request.url ?? "/"),
      timestamp,
      nonce,
      body: ctx.body
    });

    if (!signaturesEqual(signature, expected)) {
      throw new SettingsPluginAuthError(
        "plugin_auth_invalid_signature",
        "Invalid plugin request signature"
      );
    }

    return pluginId;
  }

  private getHeader(ctx: HttpContext, name: string): string | undefined {
    const request = toNodeRequest(ctx.req);
    const value = request.headers?.[name.toLowerCase()];
    if (!value) return undefined;
    return Array.isArray(value) ? value[0] : value;
  }

  private assertNonceNotReplayed(
    pluginId: string,
    nonce: string,
    expiresAt: number,
    nonceCacheMaxEntries: number
  ): void {
    const key = `${pluginId}:${nonce}`;
    const now = Math.floor(Date.now() / 1000);

    for (const [existingKey, expiration] of this.usedNonces) {
      if (expiration < now) {
        this.usedNonces.delete(existingKey);
      }
    }

    if (this.usedNonces.has(key)) {
      throw new SettingsPluginAuthError(
        "plugin_auth_nonce_replay",
        "Plugin auth nonce replay detected"
      );
    }

    if (this.usedNonces.size >= nonceCacheMaxEntries) {
      const first = this.usedNonces.keys().next();
      if (!first.done) {
        this.usedNonces.delete(first.value);
      }
    }
    this.usedNonces.set(key, expiresAt);
  }

  private async getConfig(): Promise<{ maxSkewSeconds: number; nonceCacheMaxEntries: number }> {
    const nowMs = Date.now();
    if (this.configCache && nowMs - this.configCache.loadedAtMs < 30_000) {
      return this.configCache;
    }
    if (!this.db) {
      const value = {
        loadedAtMs: nowMs,
        maxSkewSeconds: this.envMaxSkewSeconds,
        nonceCacheMaxEntries: 10_000
      };
      this.configCache = value;
      return value;
    }
    const maxSkewRaw = await readCorePackSettingValue(this.db, "core-pack:plugin_auth:max_skew_seconds");
    const nonceMaxRaw = await readCorePackSettingValue(
      this.db,
      "core-pack:plugin_auth:nonce_cache_max_entries"
    );
    const maxSkewSeconds =
      typeof maxSkewRaw === "number" && Number.isFinite(maxSkewRaw) && maxSkewRaw > 0
        ? Math.floor(maxSkewRaw)
        : this.envMaxSkewSeconds;
    const nonceCacheMaxEntries =
      typeof nonceMaxRaw === "number" && Number.isFinite(nonceMaxRaw) && nonceMaxRaw > 0
        ? Math.floor(nonceMaxRaw)
        : 10_000;
    const value = { loadedAtMs: nowMs, maxSkewSeconds, nonceCacheMaxEntries };
    this.configCache = value;
    return value;
  }
}

function toNodeRequest(value: unknown): {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
} {
  if (!value || typeof value !== "object") {
    return {};
  }

  const maybeRequest = value as {
    method?: unknown;
    url?: unknown;
    headers?: unknown;
  };

  const method = typeof maybeRequest.method === "string" ? maybeRequest.method : undefined;
  const url = typeof maybeRequest.url === "string" ? maybeRequest.url : undefined;
  const headersRaw =
    maybeRequest.headers && typeof maybeRequest.headers === "object"
      ? (maybeRequest.headers as Record<string, unknown>)
      : undefined;
  const headers: Record<string, string | string[] | undefined> = {};

  if (headersRaw) {
    for (const [key, headerValue] of Object.entries(headersRaw)) {
      if (typeof headerValue === "string") {
        headers[key.toLowerCase()] = headerValue;
      } else if (Array.isArray(headerValue)) {
        const normalized = headerValue.filter((item): item is string => typeof item === "string");
        headers[key.toLowerCase()] = normalized.length > 0 ? normalized : undefined;
      }
    }
  }

  return { method, url, headers };
}

function readMaxSkewFromEnv(): number {
  const raw = process.env.CMS_PLUGIN_AUTH_MAX_SKEW_SECONDS?.trim();
  if (!raw) return 300;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("CMS_PLUGIN_AUTH_MAX_SKEW_SECONDS must be a positive integer");
  }
  return parsed;
}
