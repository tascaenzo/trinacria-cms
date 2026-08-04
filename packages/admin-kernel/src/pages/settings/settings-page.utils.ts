import type { ListSettingDefinitionsResponse } from "@trinacria-cms/sdk";
import type { RenderableAdminSettingsSection } from "../../runtime/admin-route-runtime.js";

export type SettingDefinitionRecord = ListSettingDefinitionsResponse["data"][number];
export type SettingJsonValue =
  | string
  | number
  | boolean
  | null
  | unknown[]
  | { [key: string]: unknown };
export type SettingDraftValues = Record<string, string>;
export type SettingValueErrors = Record<string, string>;

const CORE_PACK_VISIBLE_SETTING_CATEGORIES = new Set([
  "site",
  "internationalization",
  "branding",
  "features",
  "user_flows",
  "email"
]);

const CORE_PACK_VISIBLE_SETTING_KEYS = new Set([
  "core-pack:security:plugin_access_grants",
  "core-pack:auth:mfa_mode"
]);

const CORE_PACK_HIDDEN_SETTINGS_SECTION_IDS = new Set([
  "core-pack-auth-settings",
  "core-pack-security-settings",
  "core-pack-cache-settings",
  "core-pack-settings-catalog",
  "core-pack-plugin-permissions-settings",
  "core-pack-plugin-management-settings"
]);

export function isVisibleSettingsSection(section: RenderableAdminSettingsSection): boolean {
  return !(
    section.pluginId === "core-pack" && CORE_PACK_HIDDEN_SETTINGS_SECTION_IDS.has(section.id)
  );
}

export function isVisibleSettingDefinition(record: SettingDefinitionRecord): boolean {
  if (record.ownerPluginId !== "core-pack") {
    return true;
  }

  const key = record.key.trim().toLowerCase();
  if (CORE_PACK_VISIBLE_SETTING_KEYS.has(key)) {
    return true;
  }

  const category = record.category?.trim().toLowerCase();
  return Boolean(category && CORE_PACK_VISIBLE_SETTING_CATEGORIES.has(category));
}

export function filterRecordsForSettingsSection(
  records: readonly SettingDefinitionRecord[],
  section: RenderableAdminSettingsSection
): readonly SettingDefinitionRecord[] {
  const visibleRecords = records.filter(isVisibleSettingDefinition);

  if (section.id.endsWith("settings-catalog")) {
    return visibleRecords;
  }

  const explicitKeys = new Set(
    (section.settingKeys ?? []).map((key) => key.trim().toLowerCase()).filter(Boolean)
  );
  if (explicitKeys.size > 0) {
    return visibleRecords.filter((record) => explicitKeys.has(record.key.trim().toLowerCase()));
  }

  const category = section.category?.trim().toLowerCase();
  if (category) {
    return visibleRecords.filter((record) => record.category?.trim().toLowerCase() === category);
  }

  return [];
}

export function formatSettingNavLabel(record: SettingDefinitionRecord): string {
  const parts = record.key.split(":");
  return parts[parts.length - 1]?.replace(/[-_]/g, " ") || record.key;
}

export function formatSettingFormLabel(record: SettingDefinitionRecord): string {
  const label = formatSettingNavLabel(record);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function toEditableSettingInput(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value ?? null, null, 2);
}

export function groupSettingRecordsForForm(
  records: readonly SettingDefinitionRecord[],
  translate?: (key: string, fallback: string) => string
): Array<{ title: string; records: SettingDefinitionRecord[] }> {
  const groups = new Map<string, SettingDefinitionRecord[]>();

  for (const record of records.filter(isVisibleSettingDefinition)) {
    const title = getSettingFormGroupTitle(record, translate);
    groups.set(title, [...(groups.get(title) ?? []), record]);
  }

  return Array.from(groups.entries()).map(([title, groupRecords]) => ({
    title,
    records: groupRecords
  }));
}

export function getSettingFormGroupTitle(
  record: SettingDefinitionRecord,
  translate?: (key: string, fallback: string) => string
): string {
  const key = record.key.toLowerCase();
  const category = record.category?.toLowerCase();
  const label = (translationKey: string, fallback: string, defaultLabel: string) =>
    translate?.(translationKey, fallback) ?? defaultLabel;

  if (category === "site") return label("settings.group.site", "Dettagli del sito", "Site details");
  if (category === "internationalization")
    return label("settings.group.localization", "Localizzazione", "Localization");
  if (category === "branding")
    return label("settings.group.branding", "Identità visiva", "Brand identity");
  if (category === "email") return label("settings.group.email", "Invio email", "Email delivery");
  if (category === "user_flows")
    return label("settings.group.user_flows", "Ciclo di vita utenti", "User lifecycle");
  if (category === "security")
    return label("settings.group.security", "Segreti e crittografia", "Secrets and encryption");
  if (key.includes(":login_"))
    return label("settings.group.login", "Protezione accessi", "Login protection");
  if (key.includes(":jwt_cookie_")) return label("settings.group.cookies", "Cookie", "Cookies");
  if (key.includes(":jwt_") || key.includes("strict_jwt"))
    return label("settings.group.sessions", "Token di sessione", "Session tokens");
  if (key.includes(":plugin_auth:"))
    return label("settings.group.plugin_auth", "Firma richieste plugin", "Plugin request signing");
  if (key.includes("redis_url") || key.includes("redis_prefix"))
    return label("settings.group.redis", "Connessione Redis", "Redis connection");
  if (key.includes("redis_retry") || key.includes("redis_max_retries"))
    return label("settings.group.redis_retry", "Tentativi Redis", "Redis retry policy");
  if (category === "cache")
    return label("settings.group.cache", "Cache applicativa", "Cache runtime");
  if (category === "auth")
    return label("settings.group.authentication", "Autenticazione", "Authentication");
  return label("settings.group.default", "Impostazioni", "Settings");
}

export function getSettingValueKind(
  record: SettingDefinitionRecord
): "string" | "number" | "boolean" | "json" {
  const schemaType = readSchemaType(record.schema);
  if (schemaType === "string" || schemaType === "number" || schemaType === "boolean") {
    return schemaType;
  }
  if (schemaType === "integer") {
    return "number";
  }
  if (schemaType === "array" || schemaType === "object") {
    return "json";
  }

  const sample = record.defaultValue;
  if (typeof sample === "number") return "number";
  if (typeof sample === "boolean") return "boolean";
  if (Array.isArray(sample) || (sample && typeof sample === "object")) return "json";
  return "string";
}

export function getSettingEnumOptions(value: unknown): readonly string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const enumValues = (value as { enum?: unknown }).enum;
  if (!Array.isArray(enumValues)) {
    return [];
  }

  return enumValues
    .filter((entry): entry is string | number | boolean =>
      ["string", "number", "boolean"].includes(typeof entry)
    )
    .map((entry) => String(entry));
}

export function parseSettingFormValue(
  record: SettingDefinitionRecord,
  value: string
): SettingJsonValue {
  const valueKind = getSettingValueKind(record);
  if (valueKind === "number") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new Error("Il valore deve essere numerico.");
    }
    return parsed;
  }
  if (valueKind === "boolean") {
    return value === "true";
  }
  if (valueKind === "json") {
    return JSON.parse(value) as SettingJsonValue;
  }
  return value;
}

function readSchemaType(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const type = (value as { type?: unknown }).type;
  return typeof type === "string" ? type : undefined;
}
