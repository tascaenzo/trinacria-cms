import type { AdminSettingsSectionDefinition } from "../contracts.js";

export const OFFICIAL_CORE_SETTINGS_SECTION_META: Record<
  string,
  Partial<AdminSettingsSectionDefinition>
> = {
  "core-pack:core-pack-general-settings": {
    titleKey: "settings.section.general.title",
    summary: "Site identity and localization settings used across the backoffice.",
    summaryKey: "settings.section.general.summary",
    order: 10,
    settingKeys: [
      "core-pack:site:name",
      "core-pack:site:url",
      "core-pack:cms:locale",
      "core-pack:cms:timezone"
    ]
  },
  "core-pack:core-pack-branding-settings": {
    titleKey: "settings.section.branding.title",
    summary: "Backoffice-facing brand text and logo references.",
    summaryKey: "settings.section.branding.summary",
    order: 20,
    settingKeys: ["core-pack:branding:tagline", "core-pack:branding:logo_url"]
  },
  "core-pack:core-pack-auth-settings": {
    titleKey: "settings.section.auth.title",
    summary: "Session, login lockout, cookie, and plugin-auth timing settings.",
    summaryKey: "settings.section.auth.summary",
    order: 30,
    category: "auth"
  },
  "core-pack:core-pack-security-settings": {
    titleKey: "settings.section.security.title",
    summary: "Secret handling and encryption policy settings.",
    summaryKey: "settings.section.security.summary",
    order: 40,
    category: "security"
  },
  "core-pack:core-pack-cache-settings": {
    titleKey: "settings.section.cache.title",
    summary: "Cache adapter and Redis runtime settings.",
    summaryKey: "settings.section.cache.summary",
    order: 50,
    category: "cache"
  },
  "core-pack:core-pack-settings-catalog": {
    titleKey: "settings.section.catalog.title",
    summary: "Raw owner-aware settings definitions and resolved values.",
    summaryKey: "settings.section.catalog.summary",
    order: 900,
    category: "settings"
  }
};
