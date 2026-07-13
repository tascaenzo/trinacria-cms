import type { PluginManifestAdmin } from "@trinacria-cms/kernel/contracts";
import {
  defineAdmin,
  defineAdminNavigation,
  defineAdminResource,
  defineAdminRoute,
  defineAdminSettingsSection
} from "@trinacria-cms/kernel/plugin-api";
import { CORE_PACK_PERMISSION_KEYS } from "./core-pack.security.js";

/**
 * Admin surface declared by core-pack. Kept separate from the executable plugin
 * so both backend runtime discovery and bundled backoffice hosts can consume the
 * same manifest data without duplicating page definitions.
 */
export const CORE_PACK_ADMIN_MANIFEST: PluginManifestAdmin = defineAdmin({
  routes: [
    defineAdminRoute({
      id: "plugins",
      path: "/plugins",
      label: "Plugins",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.PLUGINS_READ,
      componentRef: "core-pack.plugins",
      order: 5
    }),
    defineAdminRoute({
      id: "users",
      path: "/users",
      label: "Users",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.USERS_READ,
      componentRef: "core-pack.users",
      order: 10
    }),
    defineAdminRoute({
      id: "roles",
      path: "/roles",
      label: "Roles",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.ROLES_READ,
      componentRef: "core-pack.roles",
      order: 20
    }),
    defineAdminRoute({
      id: "permissions",
      path: "/permissions",
      label: "Permissions",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.PERMISSIONS_READ,
      componentRef: "core-pack.permissions",
      order: 30
    }),
    defineAdminRoute({
      id: "settings",
      path: "/settings",
      label: "Settings",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.SETTINGS_READ,
      componentRef: "core-pack.settings",
      order: 40
    })
  ],
  navigation: [
    defineAdminNavigation({
      id: "nav-plugins",
      path: "/plugins",
      label: "Plugins",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.PLUGINS_READ,
      order: 5
    }),
    defineAdminNavigation({
      id: "nav-users",
      path: "/users",
      label: "Users",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.USERS_READ,
      order: 10
    }),
    defineAdminNavigation({
      id: "nav-roles",
      path: "/roles",
      label: "Roles",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.ROLES_READ,
      order: 20
    }),
    defineAdminNavigation({
      id: "nav-permissions",
      path: "/permissions",
      label: "Permissions",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.PERMISSIONS_READ,
      order: 30
    }),
    defineAdminNavigation({
      id: "nav-settings",
      path: "/settings",
      label: "Settings",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.SETTINGS_READ,
      order: 40
    })
  ],
  resources: [
    defineAdminResource({
      id: "users",
      label: "Users",
      routeBase: "/users",
      apiBase: "/v1/users",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.USERS_READ
    }),
    defineAdminResource({
      id: "roles",
      label: "Roles",
      routeBase: "/roles",
      apiBase: "/v1/roles",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.ROLES_READ
    }),
    defineAdminResource({
      id: "permissions",
      label: "Permissions",
      routeBase: "/permissions",
      apiBase: "/v1/permissions",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.PERMISSIONS_READ
    })
  ],
  settingsSections: [
    defineAdminSettingsSection({
      id: "core-pack-general-settings",
      label: "General",
      namespace: "site",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.SETTINGS_READ
    }),
    defineAdminSettingsSection({
      id: "core-pack-branding-settings",
      label: "Branding",
      namespace: "branding",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.SETTINGS_READ
    }),
    defineAdminSettingsSection({
      id: "core-pack-feature-settings",
      label: "Features",
      namespace: "features",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.SETTINGS_READ
    }),
    defineAdminSettingsSection({
      id: "core-pack-user-flow-settings",
      label: "User flows",
      namespace: "user_flows",
      requiredPermission: CORE_PACK_PERMISSION_KEYS.SETTINGS_READ
    }),
    defineAdminSettingsSection({
      id: "core-pack-plugin-permissions-settings",
      label: "Plugin permissions",
      kind: "custom",
      componentRef: "core-pack:plugin-permission-center",
      namespace: "security",
      settingKeys: ["core-pack:security:plugin_access_grants"],
      requiredPermission: CORE_PACK_PERMISSION_KEYS.SETTINGS_READ
    })
  ]
});
