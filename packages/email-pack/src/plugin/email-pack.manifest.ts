import type { PluginManifest } from "@trinacria-cms/kernel";
import {
  defineEventSubscription,
  defineEvents,
  defineGrant,
  definePluginManifest,
  defineSecurity
} from "@trinacria-cms/kernel/plugin-api";
import { EMAIL_PACK_SETTING_DEFINITIONS } from "../modules/email/email-settings.js";
import { EMAIL_PACK_PLUGIN_ID } from "./email-pack.constants.js";
import {
  EMAIL_PACK_CAPABILITY_LIST,
  EMAIL_PACK_PERMISSION_DEFINITIONS,
  EMAIL_PACK_PERMISSION_KEY_LIST
} from "./email-pack.security.js";
import { EMAIL_PACK_ADMIN_MANIFEST } from "./email-pack-admin.manifest.js";

export const EMAIL_PACK_MANIFEST: PluginManifest = definePluginManifest({
  id: EMAIL_PACK_PLUGIN_ID,
  displayName: "Email Pack",
  description: "Official transactional email delivery plugin for Trinacria CMS.",
  version: "0.1.0",
  requiresCore: "^0.1.0",
  capabilities: [...EMAIL_PACK_CAPABILITY_LIST],
  dependencies: [
    {
      pluginId: "core-pack",
      versionRange: "^0.1.0"
    }
  ],
  settings: [...EMAIL_PACK_SETTING_DEFINITIONS],
  events: defineEvents({
    subscribes: [
      defineEventSubscription({
        eventName: "*:secure-event-payload-ready",
        handler: "deliverEmailRequest"
      })
    ]
  }),
  admin: EMAIL_PACK_ADMIN_MANIFEST,
  security: defineSecurity({
    permissions: [...EMAIL_PACK_PERMISSION_DEFINITIONS],
    grants: [
      defineGrant({
        roleCode: "admin",
        permissionKeys: [...EMAIL_PACK_PERMISSION_KEY_LIST]
      })
    ]
  })
});
