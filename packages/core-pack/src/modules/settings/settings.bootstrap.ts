import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import type { JsonValue } from "./settings-json.js";
import type { SettingsDefinition, SettingsService } from "./settings.service.js";

export interface CorePackSettingDefinitionSeed {
  key: string;
  category: string;
  description: string;
  defaultValue: JsonValue;
  schema: JsonValue;
}

export const CORE_PACK_SETTING_DEFINITION_SEEDS: readonly CorePackSettingDefinitionSeed[] =
  Object.freeze([
    {
      key: "core-pack:site:name",
      category: "site",
      description: "Human-readable CMS site name shown in admin shells and page chrome.",
      defaultValue: "Trinacria CMS",
      schema: {
        type: "string",
        minLength: 1,
        maxLength: 120
      } as JsonValue
    },
    {
      key: "core-pack:site:url",
      category: "site",
      description: "Canonical public origin used for links, previews, and integrations.",
      defaultValue: "http://localhost:3000",
      schema: {
        type: "string",
        format: "uri"
      } as JsonValue
    },
    {
      key: "core-pack:cms:locale",
      category: "internationalization",
      description: "Default locale used by the CMS when no content-specific locale is selected.",
      defaultValue: "it-IT",
      schema: {
        type: "string",
        pattern: "^[a-z]{2}(-[A-Z]{2})?$"
      } as JsonValue
    },
    {
      key: "core-pack:cms:timezone",
      category: "internationalization",
      description:
        "Default IANA timezone used for scheduling, editorial dates, and audit displays.",
      defaultValue: "Europe/Rome",
      schema: {
        type: "string",
        minLength: 3,
        maxLength: 120
      } as JsonValue
    },
    {
      key: "core-pack:branding:tagline",
      category: "branding",
      description:
        "Short brand descriptor surfaced in dashboards and installation handoff screens.",
      defaultValue: "Plugin-based editorial platform",
      schema: {
        type: "string",
        maxLength: 160
      } as JsonValue
    },
    {
      key: "core-pack:branding:logo_url",
      category: "branding",
      description: "Public logo URL used by the backoffice and integrations when present.",
      defaultValue: "/assets/trinacria-logo.svg",
      schema: {
        type: "string",
        format: "uri-reference"
      } as JsonValue
    },
    {
      key: "core-pack:features:editorial_workflow",
      category: "features",
      description: "Feature flag reserved for the editorial workflow milestone rollout.",
      defaultValue: false,
      schema: {
        type: "boolean"
      } as JsonValue
    },
    {
      key: "core-pack:cache:redis_url",
      category: "cache",
      description:
        "Optional Redis connection URL for shared caching across API replicas. " +
        "Leave empty to use the default in-memory cache (lost on restart, not shared across replicas).",
      defaultValue: "",
      schema: {
        type: "string",
        maxLength: 500
      } as JsonValue
    },
    {
      key: "core-pack:auth:cleanup_interval_seconds",
      category: "auth",
      description:
        "Interval used for lazy cleanup of expired auth state records (blacklist/login attempts). " +
        "Cleanup runs opportunistically during auth flows, never more often than this interval.",
      defaultValue: 300,
      schema: {
        type: "number",
        minimum: 30,
        maximum: 3600
      } as JsonValue
    },
    {
      key: "core-pack:auth:jwt_access_ttl_seconds",
      category: "auth",
      description: "JWT access-token TTL in seconds.",
      defaultValue: 24 * 60 * 60,
      schema: {
        type: "number",
        minimum: 60,
        maximum: 7 * 24 * 60 * 60
      } as JsonValue
    },
    {
      key: "core-pack:auth:jwt_refresh_ttl_seconds",
      category: "auth",
      description: "JWT refresh-token TTL in seconds.",
      defaultValue: 30 * 24 * 60 * 60,
      schema: {
        type: "number",
        minimum: 300,
        maximum: 365 * 24 * 60 * 60
      } as JsonValue
    },
    {
      key: "core-pack:auth:login_max_attempts",
      category: "auth",
      description: "Maximum failed login attempts before temporary lockout.",
      defaultValue: 5,
      schema: {
        type: "number",
        minimum: 1,
        maximum: 20
      } as JsonValue
    },
    {
      key: "core-pack:auth:login_lockout_minutes",
      category: "auth",
      description: "Temporary lockout duration in minutes after too many failed login attempts.",
      defaultValue: 15,
      schema: {
        type: "number",
        minimum: 1,
        maximum: 1440
      } as JsonValue
    },
    {
      key: "core-pack:auth:jwt_cookie_access_name",
      category: "auth",
      description: "Cookie name used for JWT access token.",
      defaultValue: "cms_access_token",
      schema: {
        type: "string",
        minLength: 1,
        maxLength: 120
      } as JsonValue
    },
    {
      key: "core-pack:auth:jwt_cookie_refresh_name",
      category: "auth",
      description: "Cookie name used for JWT refresh token.",
      defaultValue: "cms_refresh_token",
      schema: {
        type: "string",
        minLength: 1,
        maxLength: 120
      } as JsonValue
    },
    {
      key: "core-pack:auth:jwt_cookie_path",
      category: "auth",
      description: "Cookie path for auth cookies.",
      defaultValue: "/",
      schema: {
        type: "string",
        minLength: 1,
        maxLength: 255
      } as JsonValue
    },
    {
      key: "core-pack:auth:jwt_cookie_domain",
      category: "auth",
      description: "Optional cookie domain for auth cookies.",
      defaultValue: "",
      schema: {
        type: "string",
        maxLength: 255
      } as JsonValue
    },
    {
      key: "core-pack:auth:jwt_cookie_same_site",
      category: "auth",
      description: "SameSite policy for auth cookies (Strict, Lax, None).",
      defaultValue: "Lax",
      schema: {
        type: "string",
        enum: ["Strict", "Lax", "None"]
      } as JsonValue
    },
    {
      key: "core-pack:auth:jwt_cookie_secure",
      category: "auth",
      description: "Whether auth cookies are emitted with Secure=true.",
      defaultValue: true,
      schema: {
        type: "boolean"
      } as JsonValue
    },
    {
      key: "core-pack:auth:strict_jwt_secret_required",
      category: "auth",
      description:
        "If true, boot/auth fails when CMS_JWT_SECRET is missing (disables insecure dev fallback).",
      defaultValue: false,
      schema: {
        type: "boolean"
      } as JsonValue
    },
    {
      key: "core-pack:plugin_auth:max_skew_seconds",
      category: "auth",
      description: "Maximum accepted timestamp skew (seconds) for signed plugin settings requests.",
      defaultValue: 300,
      schema: {
        type: "number",
        minimum: 30,
        maximum: 3600
      } as JsonValue
    },
    {
      key: "core-pack:plugin_auth:nonce_cache_max_entries",
      category: "auth",
      description: "Maximum in-memory nonce entries kept for replay protection.",
      defaultValue: 10000,
      schema: {
        type: "number",
        minimum: 100,
        maximum: 200000
      } as JsonValue
    },
    {
      key: "core-pack:settings:master_key_version",
      category: "security",
      description: "Key version label persisted with encrypted secrets.",
      defaultValue: "v1",
      schema: {
        type: "string",
        minLength: 1,
        maxLength: 32
      } as JsonValue
    },
    {
      key: "core-pack:settings:strict_master_key_required",
      category: "security",
      description:
        "If true, boot fails when CMS_SETTINGS_MASTER_KEY is missing (disables insecure dev fallback).",
      defaultValue: false,
      schema: {
        type: "boolean"
      } as JsonValue
    },
    {
      key: "core-pack:cache:redis_prefix",
      category: "cache",
      description: "Redis key prefix for cache entries.",
      defaultValue: "trinacria",
      schema: {
        type: "string",
        minLength: 1,
        maxLength: 120
      } as JsonValue
    },
    {
      key: "core-pack:cache:redis_max_retries_per_request",
      category: "cache",
      description: "Maximum per-request Redis retries before failing.",
      defaultValue: 3,
      schema: {
        type: "number",
        minimum: 0,
        maximum: 20
      } as JsonValue
    },
    {
      key: "core-pack:cache:redis_retry_max_attempts",
      category: "cache",
      description: "Maximum reconnect attempts in Redis retry strategy.",
      defaultValue: 3,
      schema: {
        type: "number",
        minimum: 0,
        maximum: 50
      } as JsonValue
    },
    {
      key: "core-pack:cache:redis_retry_base_ms",
      category: "cache",
      description: "Base milliseconds used by Redis linear backoff (attempt * base).",
      defaultValue: 200,
      schema: {
        type: "number",
        minimum: 10,
        maximum: 10000
      } as JsonValue
    },
    {
      key: "core-pack:cache:redis_retry_cap_ms",
      category: "cache",
      description: "Maximum milliseconds cap for Redis retry backoff.",
      defaultValue: 2000,
      schema: {
        type: "number",
        minimum: 50,
        maximum: 60000
      } as JsonValue
    }
  ]);

export async function provisionCorePackSettingDefinitions(
  settings: SettingsService
): Promise<readonly SettingsDefinition[]> {
  const definitions: SettingsDefinition[] = [];

  for (const definition of CORE_PACK_SETTING_DEFINITION_SEEDS) {
    definitions.push(
      await settings.upsertDefinition({
        requesterPluginId: CORE_PACK_PLUGIN_ID,
        key: definition.key,
        category: definition.category,
        description: definition.description,
        schema: definition.schema,
        defaultValue: definition.defaultValue,
        status: "active"
      })
    );
  }

  return definitions;
}
