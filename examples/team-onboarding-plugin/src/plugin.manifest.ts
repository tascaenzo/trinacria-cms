import {
  defineAdmin,
  defineAdminSettingsSection,
  defineAdminWidget,
  defineBooleanSetting,
  defineEmittedEvent,
  defineEventSubscription,
  defineEvents,
  defineGrant,
  definePluginManifest,
  defineSecurity,
  defineStringSetting
} from "@trinacria-cms/kernel/plugin-api";
import { TEAM_ONBOARDING_PLUGIN_ID } from "./plugin.constants.js";
import {
  TEAM_ONBOARDING_CAPABILITY_LIST,
  TEAM_ONBOARDING_PERMISSION_DEFINITIONS,
  TEAM_ONBOARDING_PERMISSION_KEYS
} from "./plugin.security.js";

/**
 * Reference manifest for the beta use case: invite a team member, configure
 * the welcome journey, and expose the result in the shared backoffice.
 */
export const TEAM_ONBOARDING_MANIFEST = definePluginManifest({
  id: TEAM_ONBOARDING_PLUGIN_ID,
  displayName: "Team onboarding",
  description: "Reference plugin for the team-onboarding beta journey.",
  version: "0.1.0",
  requiresCore: "^0.1.0",
  capabilities: TEAM_ONBOARDING_CAPABILITY_LIST,
  dependencies: [{ pluginId: "core-pack", versionRange: "^0.1.0" }],
  settings: [
    defineBooleanSetting({
      pluginId: TEAM_ONBOARDING_PLUGIN_ID,
      domain: "invites",
      name: "welcome_email_enabled",
      category: "team-onboarding",
      description: "Send the welcome journey after an administrator invites a team member.",
      defaultValue: true
    }),
    defineStringSetting({
      pluginId: TEAM_ONBOARDING_PLUGIN_ID,
      domain: "invites",
      name: "default_role",
      category: "team-onboarding",
      description: "Role proposed to operators while completing team onboarding.",
      defaultValue: "editor",
      minLength: 1,
      maxLength: 80
    })
  ],
  events: defineEvents({
    emits: [
      defineEmittedEvent({
        name: "onboarding-reviewed",
        visibility: "audit",
        version: 1,
        delivery: "async",
        payloadSchema: {
          type: "object",
          required: ["userId", "reviewedBy"],
          additionalProperties: false,
          properties: {
            userId: { type: "string" },
            reviewedBy: { type: "string" }
          }
        }
      })
    ],
    subscribes: [
      defineEventSubscription({
        eventName: "core-pack:user-invited",
        handler: "recordCorePackInvite"
      })
    ]
  }),
  admin: defineAdmin({
    widgets: [
      defineAdminWidget({
        id: "team-onboarding-status",
        label: "Team onboarding",
        requiredPermission: TEAM_ONBOARDING_PERMISSION_KEYS.READ
      })
    ],
    settingsSections: [
      defineAdminSettingsSection({
        id: "team-onboarding-settings",
        label: "Team onboarding",
        namespace: "team-onboarding",
        category: "team-onboarding",
        settingKeys: [
          `${TEAM_ONBOARDING_PLUGIN_ID}:invites:welcome_email_enabled`,
          `${TEAM_ONBOARDING_PLUGIN_ID}:invites:default_role`
        ],
        requiredPermission: TEAM_ONBOARDING_PERMISSION_KEYS.MANAGE,
        kind: "form",
        summary: "Configure the default invitation and welcome journey.",
        order: 10
      })
    ]
  }),
  security: defineSecurity({
    permissions: TEAM_ONBOARDING_PERMISSION_DEFINITIONS,
    grants: [
      defineGrant({
        roleCode: "editor",
        permissionKeys: [TEAM_ONBOARDING_PERMISSION_KEYS.READ]
      }),
      defineGrant({
        roleCode: "admin",
        permissionKeys: [
          TEAM_ONBOARDING_PERMISSION_KEYS.READ,
          TEAM_ONBOARDING_PERMISSION_KEYS.MANAGE
        ]
      })
    ]
  })
});
