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
  "core-pack:core-pack-feature-settings": {
    titleKey: "settings.section.features.title",
    summary: "Feature flags exposed for operator-level rollout control.",
    summaryKey: "settings.section.features.summary",
    order: 30,
    category: "features"
  }
};
