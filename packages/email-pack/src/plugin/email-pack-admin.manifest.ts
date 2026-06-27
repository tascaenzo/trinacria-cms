import { defineAdmin, defineAdminSettingsSection } from "@trinacria-cms/kernel/plugin-api";
import { EMAIL_PACK_PERMISSION_KEYS } from "./email-pack.security.js";

export const EMAIL_PACK_ADMIN_MANIFEST = defineAdmin({
  settingsSections: [
    defineAdminSettingsSection({
      id: "email-pack-email-settings",
      label: "Email",
      namespace: "email",
      requiredPermission: EMAIL_PACK_PERMISSION_KEYS.SETTINGS_READ
    })
  ]
});
