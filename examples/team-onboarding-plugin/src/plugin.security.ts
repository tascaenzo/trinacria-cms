import { definePermissionSet } from "@trinacria-cms/kernel/plugin-api";
import { TEAM_ONBOARDING_PLUGIN_ID } from "./plugin.constants.js";

export const TEAM_ONBOARDING_CAPABILITIES = {
  READ: "team-onboarding.read",
  MANAGE: "team-onboarding.manage"
} as const;

export const TEAM_ONBOARDING_CAPABILITY_LIST = Object.freeze(
  Object.values(TEAM_ONBOARDING_CAPABILITIES)
);

const permissions = definePermissionSet(TEAM_ONBOARDING_PLUGIN_ID, {
  READ: {
    resource: "onboarding",
    action: "read",
    displayName: "Read team onboarding status"
  },
  MANAGE: {
    resource: "onboarding",
    action: "manage",
    displayName: "Manage team onboarding settings"
  }
});

export const TEAM_ONBOARDING_PERMISSION_KEYS = permissions.keys;
export const TEAM_ONBOARDING_PERMISSION_DEFINITIONS = Object.freeze(permissions.permissions);
