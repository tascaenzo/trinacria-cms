import { definePermissionSet } from "@trinacria-cms/kernel/plugin-api";
import { EMAIL_PACK_PLUGIN_ID } from "./email-pack.constants.js";

export const EMAIL_PACK_CAPABILITIES = {
  SETTINGS_READ: "settings.read",
  SETTINGS_WRITE: "settings.write",
  EMAIL_SEND: "email.send"
} as const;

export type EmailPackCapability =
  (typeof EMAIL_PACK_CAPABILITIES)[keyof typeof EMAIL_PACK_CAPABILITIES];

export const EMAIL_PACK_CAPABILITY_LIST: readonly EmailPackCapability[] = Object.freeze(
  Object.values(EMAIL_PACK_CAPABILITIES)
);

const EMAIL_PACK_PERMISSIONS = definePermissionSet(EMAIL_PACK_PLUGIN_ID, {
  SETTINGS_READ: {
    resource: "settings",
    action: "read",
    displayName: "Read email settings"
  },
  SETTINGS_WRITE: {
    resource: "settings",
    action: "write",
    displayName: "Write email settings"
  },
  EMAIL_SEND: {
    resource: "email",
    action: "send",
    displayName: "Send email"
  }
});

export const EMAIL_PACK_PERMISSION_KEYS = EMAIL_PACK_PERMISSIONS.keys;

export type EmailPackPermissionKey =
  (typeof EMAIL_PACK_PERMISSION_KEYS)[keyof typeof EMAIL_PACK_PERMISSION_KEYS];

export const EMAIL_PACK_PERMISSION_DEFINITIONS = Object.freeze(EMAIL_PACK_PERMISSIONS.permissions);

export const EMAIL_PACK_PERMISSION_KEY_LIST: readonly EmailPackPermissionKey[] = Object.freeze(
  EMAIL_PACK_PERMISSION_DEFINITIONS.map((permission) => permission.key)
);
