import { definePermissionSet, defineRole } from "@trinacria-cms/kernel/plugin-api";
import { CORE_PACK_PLUGIN_ID } from "./core-pack.constants.js";

/**
 * Canonical capability catalog exposed by core-pack.
 * Keep this as single source of truth to avoid string drift.
 */
export const CORE_PACK_CAPABILITIES = {
  PLUGINS_READ: "plugins.read",
  USERS_READ: "users.read",
  USERS_WRITE: "users.write",
  ROLES_READ: "roles.read",
  ROLES_WRITE: "roles.write",
  PERMISSIONS_READ: "permissions.read",
  PERMISSIONS_WRITE: "permissions.write",
  SETTINGS_READ: "settings.read",
  SETTINGS_WRITE: "settings.write",
  SETTINGS_SECRETS_READ: "settings.secrets.read",
  SETTINGS_SECRETS_WRITE: "settings.secrets.write"
} as const;

export type CorePackCapability =
  (typeof CORE_PACK_CAPABILITIES)[keyof typeof CORE_PACK_CAPABILITIES];

export const CORE_PACK_CAPABILITY_LIST: readonly CorePackCapability[] = Object.freeze(
  Object.values(CORE_PACK_CAPABILITIES)
);

const CORE_PACK_PERMISSIONS = definePermissionSet(CORE_PACK_PLUGIN_ID, {
  PLUGINS_READ: {
    resource: "plugins",
    action: "read",
    displayName: "Read plugin operations"
  },
  USERS_READ: {
    resource: "users",
    action: "read",
    displayName: "Read users"
  },
  USERS_WRITE: {
    resource: "users",
    action: "write",
    displayName: "Write users"
  },
  ROLES_READ: {
    resource: "roles",
    action: "read",
    displayName: "Read roles"
  },
  ROLES_WRITE: {
    resource: "roles",
    action: "write",
    displayName: "Write roles"
  },
  PERMISSIONS_READ: {
    resource: "permissions",
    action: "read",
    displayName: "Read permissions"
  },
  PERMISSIONS_WRITE: {
    resource: "permissions",
    action: "write",
    displayName: "Write permissions"
  },
  SETTINGS_READ: {
    resource: "settings",
    action: "read",
    displayName: "Read settings"
  },
  SETTINGS_WRITE: {
    resource: "settings",
    action: "write",
    displayName: "Write settings"
  },
  SETTINGS_SECRETS_READ: {
    resource: "settings.secrets",
    action: "read",
    displayName: "Read settings secrets"
  },
  SETTINGS_SECRETS_WRITE: {
    resource: "settings.secrets",
    action: "write",
    displayName: "Write settings secrets"
  }
});

/**
 * Canonical permission keys exposed by core-pack.
 * They are namespaced through `CORE_PACK_PLUGIN_ID`.
 */
export const CORE_PACK_PERMISSION_KEYS = CORE_PACK_PERMISSIONS.keys;

export type CorePackPermissionKey =
  (typeof CORE_PACK_PERMISSION_KEYS)[keyof typeof CORE_PACK_PERMISSION_KEYS];

export interface CorePackPermissionDefinition {
  key: CorePackPermissionKey;
  displayName: string;
  description?: string;
}

/**
 * Public permission definition list used by the core-pack manifest and reusable
 * by other packages at compile-time.
 */
export const CORE_PACK_PERMISSION_DEFINITIONS: readonly CorePackPermissionDefinition[] =
  Object.freeze(CORE_PACK_PERMISSIONS.permissions);

export const CORE_PACK_PERMISSION_KEY_LIST: readonly CorePackPermissionKey[] = Object.freeze(
  CORE_PACK_PERMISSION_DEFINITIONS.map((permission) => permission.key)
);

/**
 * Default role metadata exported for consistency across integrations.
 */
export const CORE_PACK_ADMIN_ROLE = Object.freeze(
  defineRole({
    code: "admin",
    name: "Administrator",
    description: "Default full-access role provided by core-pack"
  })
);

export const CORE_PACK_EDITOR_ROLE = Object.freeze(
  defineRole({
    code: "editor",
    name: "Editor",
    description: "Default editorial role intended for content management grants"
  })
);

export const CORE_PACK_VIEWER_ROLE = Object.freeze(
  defineRole({
    code: "viewer",
    name: "Viewer",
    description: "Default read-only role for backoffice visibility"
  })
);

export const CORE_PACK_DEFAULT_ROLES = Object.freeze([
  CORE_PACK_ADMIN_ROLE,
  CORE_PACK_EDITOR_ROLE,
  CORE_PACK_VIEWER_ROLE
]);

export const CORE_PACK_READONLY_PERMISSION_KEY_LIST: readonly CorePackPermissionKey[] =
  Object.freeze([
    CORE_PACK_PERMISSION_KEYS.PLUGINS_READ,
    CORE_PACK_PERMISSION_KEYS.USERS_READ,
    CORE_PACK_PERMISSION_KEYS.ROLES_READ,
    CORE_PACK_PERMISSION_KEYS.PERMISSIONS_READ,
    CORE_PACK_PERMISSION_KEYS.SETTINGS_READ
  ]);
