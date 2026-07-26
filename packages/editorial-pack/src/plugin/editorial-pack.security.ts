import { definePermissionSet, defineRole } from "@trinacria-cms/kernel/plugin-api";
import { EDITORIAL_PACK_PLUGIN_ID } from "./editorial-pack.constants.js";

export const EDITORIAL_PACK_CAPABILITIES = {
  CONTENT_TYPES: "editorial.content-types",
  ENTRIES: "editorial.entries",
  WORKFLOW: "editorial.workflow",
  TAXONOMIES: "editorial.taxonomies",
  REVISIONS: "editorial.revisions"
} as const;

export type EditorialPackCapability =
  (typeof EDITORIAL_PACK_CAPABILITIES)[keyof typeof EDITORIAL_PACK_CAPABILITIES];

export const EDITORIAL_PACK_CAPABILITY_LIST: readonly EditorialPackCapability[] = Object.freeze(
  Object.values(EDITORIAL_PACK_CAPABILITIES)
);

const EDITORIAL_PACK_PERMISSIONS = definePermissionSet(EDITORIAL_PACK_PLUGIN_ID, {
  CONTENT_TYPES_READ: {
    resource: "content-types",
    action: "read",
    displayName: "Read content types"
  },
  CONTENT_TYPES_MANAGE: {
    resource: "content-types",
    action: "manage",
    displayName: "Manage content types"
  },
  ENTRIES_READ: { resource: "entries", action: "read", displayName: "Read editorial entries" },
  ENTRIES_CREATE: {
    resource: "entries",
    action: "create",
    displayName: "Create editorial entries"
  },
  ENTRIES_UPDATE: {
    resource: "entries",
    action: "update",
    displayName: "Update editorial entries"
  },
  ENTRIES_DELETE: {
    resource: "entries",
    action: "delete",
    displayName: "Delete editorial entries"
  },
  ENTRIES_SUBMIT: {
    resource: "entries",
    action: "submit",
    displayName: "Submit entries for review"
  },
  ENTRIES_REVIEW: {
    resource: "entries",
    action: "review",
    displayName: "Review editorial entries"
  },
  ENTRIES_APPROVE: {
    resource: "entries",
    action: "approve",
    displayName: "Approve editorial entries"
  },
  ENTRIES_PUBLISH: {
    resource: "entries",
    action: "publish",
    displayName: "Publish editorial entries"
  },
  REVISIONS_READ: {
    resource: "revisions",
    action: "read",
    displayName: "Read editorial revisions"
  },
  REVISIONS_RESTORE: {
    resource: "revisions",
    action: "restore",
    displayName: "Restore editorial revisions"
  },
  TAXONOMIES_MANAGE: {
    resource: "taxonomies",
    action: "manage",
    displayName: "Manage editorial taxonomies"
  },
  SETTINGS_MANAGE: {
    resource: "settings",
    action: "manage",
    displayName: "Manage editorial settings"
  }
});

export const EDITORIAL_PACK_PERMISSION_KEYS = EDITORIAL_PACK_PERMISSIONS.keys;
export type EditorialPackPermissionKey =
  (typeof EDITORIAL_PACK_PERMISSION_KEYS)[keyof typeof EDITORIAL_PACK_PERMISSION_KEYS];
export const EDITORIAL_PACK_PERMISSION_DEFINITIONS = Object.freeze(
  EDITORIAL_PACK_PERMISSIONS.permissions
);
export const EDITORIAL_PACK_PERMISSION_KEY_LIST: readonly EditorialPackPermissionKey[] =
  Object.freeze(EDITORIAL_PACK_PERMISSION_DEFINITIONS.map((permission) => permission.key));

export const EDITORIAL_PACK_AUTHOR_ROLE = Object.freeze(
  defineRole({
    code: "author",
    name: "Author",
    description: "Creates and maintains editorial entries according to the ownership policy."
  })
);

export const EDITORIAL_PACK_REVIEWER_ROLE = Object.freeze(
  defineRole({
    code: "reviewer",
    name: "Reviewer",
    description: "Reviews assigned editorial entries and leaves internal feedback."
  })
);

export const EDITORIAL_PACK_CONTENT_MANAGER_ROLE = Object.freeze(
  defineRole({
    code: "content-manager",
    name: "Content manager",
    description: "Configures editorial models and operational policies."
  })
);

export const EDITORIAL_PACK_ROLES = Object.freeze([
  EDITORIAL_PACK_AUTHOR_ROLE,
  EDITORIAL_PACK_REVIEWER_ROLE,
  EDITORIAL_PACK_CONTENT_MANAGER_ROLE
]);
