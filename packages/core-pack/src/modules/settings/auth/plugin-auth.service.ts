import { createHash } from "node:crypto";
import type { HttpContext, PluginNonceStore } from "@trinacria-cms/kernel";
import type { RuntimeConfigService } from "../config/runtime-config.service.js";
import {
  buildPluginRequestSignature,
  PLUGIN_AUTH_HEADERS,
  signaturesEqual
} from "./plugin-auth.js";
import type { PluginAuthKey, PluginAuthKeyProvider } from "./plugin-auth-key-provider.js";
export interface SettingsPluginAuthServiceOptions {
  maxSkewSeconds?: number;
  now?: () => number;
}
export interface SettingsPluginAuthObservabilitySnapshot {
  successes: number;
  failures: number;
  replays: number;
  storeFailures: number;
}
export class SettingsPluginAuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SettingsPluginAuthError";
  }
}
/** Signature first, then one atomic shared consume. Only protocol v2 is accepted. */
export class SettingsPluginAuthService {
  private readonly metrics: SettingsPluginAuthObservabilitySnapshot = {
    successes: 0,
    failures: 0,
    replays: 0,
    storeFailures: 0
  };
  constructor(
    private readonly keyProvider: PluginAuthKeyProvider,
    private readonly config: RuntimeConfigService | null,
    private readonly nonceStore: PluginNonceStore,
    private readonly options: SettingsPluginAuthServiceOptions = {}
  ) {
    if (["production", "staging"].includes(process.env.NODE_ENV ?? "") && !nonceStore.shared)
      throw new SettingsPluginAuthError(
        "plugin_auth_configuration_invalid",
        "Production/staging requires a shared nonce store"
      );
    if (
      options.maxSkewSeconds !== undefined &&
      (!Number.isSafeInteger(options.maxSkewSeconds) ||
        options.maxSkewSeconds < 1 ||
        options.maxSkewSeconds > 3600)
    )
      throw new Error("Invalid plugin authentication skew");
  }
  async authenticateRequest(ctx: HttpContext): Promise<string> {
    try {
      const request = ctx.req as unknown as {
        headers?: Record<string, string | string[] | undefined>;
        url?: string;
        method?: string;
      };
      const header = (name: string) => {
        const value = request.headers?.[name];
        return typeof value === "string" ? value : undefined;
      };
      const pluginId = header(PLUGIN_AUTH_HEADERS.pluginId),
        rawTimestamp = header(PLUGIN_AUTH_HEADERS.timestamp),
        nonce = header(PLUGIN_AUTH_HEADERS.nonce),
        signature = header(PLUGIN_AUTH_HEADERS.signature),
        keyId = header(PLUGIN_AUTH_HEADERS.keyId),
        version = header(PLUGIN_AUTH_HEADERS.version);
      if (!pluginId || !rawTimestamp || !nonce || !signature || !keyId || !version)
        throw new SettingsPluginAuthError(
          "plugin_auth_missing_headers",
          "Missing v2 plugin authentication headers"
        );
      if (version !== "2")
        throw new SettingsPluginAuthError(
          "plugin_auth_version_unsupported",
          "Only plugin authentication protocol v2 is accepted"
        );
      if (
        !/^[a-z0-9][a-z0-9._/-]{0,119}$/.test(pluginId) ||
        !/^[a-zA-Z0-9_-]{24,128}$/.test(nonce) ||
        !/^[a-fA-F0-9]{64}$/.test(signature) ||
        !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(keyId)
      )
        throw new SettingsPluginAuthError(
          "plugin_auth_invalid_headers",
          "Invalid plugin authentication headers"
        );
      if (!/^\d{1,13}$/.test(rawTimestamp) || !Number.isSafeInteger(Number(rawTimestamp)))
        throw new SettingsPluginAuthError(
          "plugin_auth_invalid_timestamp",
          "Timestamp must be a strict integer"
        );
      const timestamp = Number(rawTimestamp),
        nowMs = (this.options.now ?? Date.now)(),
        now = Math.floor(nowMs / 1000);
      const maxSkew = this.config
        ? await this.config.getNumber("core-pack:plugin_auth:max_skew_seconds", {
            envVar: "CMS_PLUGIN_AUTH_MAX_SKEW_SECONDS",
            fallback: this.options.maxSkewSeconds ?? 300,
            min: 30,
            max: 3600
          })
        : (this.options.maxSkewSeconds ?? 300);
      if (maxSkew === undefined || !Number.isSafeInteger(maxSkew))
        throw new SettingsPluginAuthError(
          "plugin_auth_configuration_invalid",
          "Invalid configured plugin authentication skew"
        );
      if (Math.abs(now - timestamp) > maxSkew)
        throw new SettingsPluginAuthError(
          "plugin_auth_timestamp_expired",
          "Plugin authentication timestamp expired"
        );
      let key: PluginAuthKey | null;
      try {
        key = await this.keyProvider.getKey(pluginId, keyId, nowMs);
      } catch {
        throw new SettingsPluginAuthError(
          "plugin_auth_key_store_unavailable",
          "Plugin authentication key store unavailable"
        );
      }
      if (!key || key.id !== keyId)
        throw new SettingsPluginAuthError(
          "plugin_auth_plugin_not_configured",
          "Plugin authentication key is not configured"
        );
      let expected: string;
      try {
        expected = buildPluginRequestSignature({
          pluginId,
          keyId,
          secret: key.secret,
          method: request.method ?? "GET",
          path: request.url ?? "/",
          timestamp,
          nonce,
          body: ctx.body
        });
      } catch {
        throw new SettingsPluginAuthError(
          "plugin_auth_invalid_request",
          "Request target/body cannot be signed canonically"
        );
      }
      if (!signaturesEqual(signature, expected))
        throw new SettingsPluginAuthError(
          "plugin_auth_invalid_signature",
          "Invalid plugin request signature"
        );
      let consumed: boolean;
      try {
        consumed = await this.nonceStore.consume(
          pluginId,
          createHash("sha256").update(nonce).digest("hex"),
          new Date((timestamp + maxSkew + 1) * 1000)
        );
      } catch {
        this.metrics.storeFailures++;
        throw new SettingsPluginAuthError(
          "plugin_auth_nonce_store_unavailable",
          "Plugin authentication nonce store unavailable"
        );
      }
      if (!consumed) {
        this.metrics.replays++;
        throw new SettingsPluginAuthError(
          "plugin_auth_nonce_replay",
          "Plugin auth nonce replay detected"
        );
      }
      this.metrics.successes++;
      return pluginId;
    } catch (error) {
      this.metrics.failures++;
      throw error;
    }
  }
  getObservabilitySnapshot(): SettingsPluginAuthObservabilitySnapshot {
    return { ...this.metrics };
  }
}
