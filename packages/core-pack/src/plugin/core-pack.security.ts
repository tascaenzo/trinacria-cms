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
  API_KEYS_READ: "api_keys.read",
  API_KEYS_WRITE: "api_keys.write",
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

/**
 * Canonical permission keys exposed by core-pack.
 * They are namespaced through `CORE_PACK_PLUGIN_ID`.
 */
export const CORE_PACK_PERMISSION_KEYS = {
  PLUGINS_READ: `${CORE_PACK_PLUGIN_ID}:plugins:read`,
  USERS_READ: `${CORE_PACK_PLUGIN_ID}:users:read`,
  USERS_WRITE: `${CORE_PACK_PLUGIN_ID}:users:write`,
  ROLES_READ: `${CORE_PACK_PLUGIN_ID}:roles:read`,
  ROLES_WRITE: `${CORE_PACK_PLUGIN_ID}:roles:write`,
  PERMISSIONS_READ: `${CORE_PACK_PLUGIN_ID}:permissions:read`,
  PERMISSIONS_WRITE: `${CORE_PACK_PLUGIN_ID}:permissions:write`,
  API_KEYS_READ: `${CORE_PACK_PLUGIN_ID}:api_keys:read`,
  API_KEYS_WRITE: `${CORE_PACK_PLUGIN_ID}:api_keys:write`,
  SETTINGS_READ: `${CORE_PACK_PLUGIN_ID}:settings:read`,
  SETTINGS_WRITE: `${CORE_PACK_PLUGIN_ID}:settings:write`,
  SETTINGS_SECRETS_READ: `${CORE_PACK_PLUGIN_ID}:settings.secrets:read`,
  SETTINGS_SECRETS_WRITE: `${CORE_PACK_PLUGIN_ID}:settings.secrets:write`
} as const;

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
  Object.freeze([
    {
      key: CORE_PACK_PERMISSION_KEYS.PLUGINS_READ,
      displayName: "Read plugin operations"
    },
    {
      key: CORE_PACK_PERMISSION_KEYS.USERS_READ,
      displayName: "Read users"
    },
    {
      key: CORE_PACK_PERMISSION_KEYS.USERS_WRITE,
      displayName: "Write users"
    },
    {
      key: CORE_PACK_PERMISSION_KEYS.ROLES_READ,
      displayName: "Read roles"
    },
    {
      key: CORE_PACK_PERMISSION_KEYS.ROLES_WRITE,
      displayName: "Write roles"
    },
    {
      key: CORE_PACK_PERMISSION_KEYS.PERMISSIONS_READ,
      displayName: "Read permissions"
    },
    {
      key: CORE_PACK_PERMISSION_KEYS.PERMISSIONS_WRITE,
      displayName: "Write permissions"
    },
    {
      key: CORE_PACK_PERMISSION_KEYS.API_KEYS_READ,
      displayName: "Read API keys"
    },
    {
      key: CORE_PACK_PERMISSION_KEYS.API_KEYS_WRITE,
      displayName: "Write API keys"
    },
    {
      key: CORE_PACK_PERMISSION_KEYS.SETTINGS_READ,
      displayName: "Read settings"
    },
    {
      key: CORE_PACK_PERMISSION_KEYS.SETTINGS_WRITE,
      displayName: "Write settings"
    },
    {
      key: CORE_PACK_PERMISSION_KEYS.SETTINGS_SECRETS_READ,
      displayName: "Read settings secrets"
    },
    {
      key: CORE_PACK_PERMISSION_KEYS.SETTINGS_SECRETS_WRITE,
      displayName: "Write settings secrets"
    }
  ]);

export const CORE_PACK_PERMISSION_KEY_LIST: readonly CorePackPermissionKey[] = Object.freeze(
  CORE_PACK_PERMISSION_DEFINITIONS.map((permission) => permission.key)
);

/**
 * Default admin role metadata exported for consistency across integrations.
 */
export const CORE_PACK_ADMIN_ROLE = Object.freeze({
  code: "admin",
  name: "Administrator",
  description: "Default full-access role provided by core-pack"
});
