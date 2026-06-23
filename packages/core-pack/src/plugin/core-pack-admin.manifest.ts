import type { PluginManifestAdmin } from "@trinacria-cms/kernel/contracts";
import { CORE_PACK_PERMISSION_KEYS } from "./core-pack.security.js";

/**
 * Admin surface declared by core-pack. Kept separate from the executable plugin
 * so both backend runtime discovery and bundled backoffice hosts can consume the
 * same manifest data without duplicating page definitions.
 */
export const CORE_PACK_ADMIN_MANIFEST: PluginManifestAdmin = {
  routes: [
    {
      id: "users",
      path: "/users",
      label: "Users",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.USERS_READ,
      componentRef: "core-pack.users",
      order: 10
    },
    {
      id: "roles",
      path: "/roles",
      label: "Roles",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.ROLES_READ,
      componentRef: "core-pack.roles",
      order: 20
    },
    {
      id: "permissions",
      path: "/permissions",
      label: "Permissions",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.PERMISSIONS_READ,
      componentRef: "core-pack.permissions",
      order: 30
    },
    {
      id: "settings",
      path: "/settings",
      label: "Settings",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.SETTINGS_READ,
      componentRef: "core-pack.settings",
      order: 40
    }
  ],
  navigation: [
    {
      id: "nav-users",
      path: "/users",
      label: "Users",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.USERS_READ,
      order: 10
    },
    {
      id: "nav-roles",
      path: "/roles",
      label: "Roles",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.ROLES_READ,
      order: 20
    },
    {
      id: "nav-permissions",
      path: "/permissions",
      label: "Permissions",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.PERMISSIONS_READ,
      order: 30
    },
    {
      id: "nav-settings",
      path: "/settings",
      label: "Settings",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.SETTINGS_READ,
      order: 40
    }
  ],
  resources: [
    {
      id: "users",
      label: "Users",
      routeBase: "/users",
      apiBase: "/v1/users",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.USERS_READ
    },
    {
      id: "roles",
      label: "Roles",
      routeBase: "/roles",
      apiBase: "/v1/roles",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.ROLES_READ
    },
    {
      id: "permissions",
      label: "Permissions",
      routeBase: "/permissions",
      apiBase: "/v1/permissions",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.PERMISSIONS_READ
    }
  ],
  settingsSections: [
    {
      id: "core-pack-general-settings",
      label: "General",
      namespace: "site",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.SETTINGS_READ
    },
    {
      id: "core-pack-branding-settings",
      label: "Branding",
      namespace: "branding",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.SETTINGS_READ
    },
    {
      id: "core-pack-auth-settings",
      label: "Authentication",
      namespace: "auth",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.SETTINGS_READ
    },
    {
      id: "core-pack-security-settings",
      label: "Security",
      namespace: "security",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.SETTINGS_READ
    },
    {
      id: "core-pack-cache-settings",
      label: "Cache",
      namespace: "cache",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.SETTINGS_READ
    },
    {
      id: "core-pack-settings-catalog",
      label: "Technical catalog",
      namespace: "settings",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.SETTINGS_READ
    }
  ]
};
