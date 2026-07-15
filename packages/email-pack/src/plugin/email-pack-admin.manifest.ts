import {
  defineAdmin,
  defineAdminSettingsSection
} from "@trinacria-cms/kernel/plugin-api";
import { EMAIL_PACK_PERMISSION_KEYS } from "./email-pack.security.js";

export const EMAIL_PACK_ADMIN_MANIFEST = defineAdmin({
  settingsSections: [
    defineAdminSettingsSection({
      id: "email-pack-email-settings",
      label: "Email",
      namespace: "email",
      requiredPermission: EMAIL_PACK_PERMISSION_KEYS.SETTINGS_READ
    }),
    defineAdminSettingsSection({
      id: "email-pack-email-template-settings",
      label: "Email templates",
      kind: "custom",
      componentRef: "email-pack:email-template-manager",
      namespace: "email_templates",
      requiredPermission: EMAIL_PACK_PERMISSION_KEYS.SETTINGS_READ
    })
  ]
});
