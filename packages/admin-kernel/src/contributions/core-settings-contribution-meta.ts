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
  "core-pack:core-pack-backoffice-theme-settings": {
    titleKey: "settings.section.backoffice_theme.title",
    summary: "Shared theme and accent color for every operator.",
    summaryKey: "settings.section.backoffice_theme.summary",
    order: 25
  },
  "core-pack:core-pack-user-flow-settings": {
    titleKey: "settings.section.user_flows.title",
    summary: "Registration, invitations, verification, and password recovery policies.",
    summaryKey: "settings.section.user_flows.summary",
    order: 40,
    category: "user_flows"
  },
  "core-pack:core-pack-plugin-permissions-settings": {
    titleKey: "settings.section.plugin_permissions.title",
    summary: "Admin approvals for sensitive plugin event access and secure payload claims.",
    summaryKey: "settings.section.plugin_permissions.summary",
    order: 50,
    settingKeys: ["core-pack:security:plugin_access_grants"]
  },
  "core-pack:core-pack-plugin-management-settings": {
    title: "Plugins",
    summary: "Plugin installati e azioni disponibili nel runtime corrente.",
    order: 60
  },
  "email-pack:email-pack-email-settings": {
    titleKey: "settings.section.email.title",
    summary: "Transactional email provider and SMTP delivery settings.",
    summaryKey: "settings.section.email.summary",
    order: 60,
    category: "email"
  },
  "email-pack:email-pack-email-template-settings": {
    title: "Email templates",
    titleKey: "settings.section.email_templates.title",
    summary: "Transactional email subject, body, variables, and preview.",
    summaryKey: "settings.section.email_templates.summary",
    order: 70
  }
};
