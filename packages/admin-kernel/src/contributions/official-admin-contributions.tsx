import { createDashboardRender } from "../pages/dashboard-page.js";
import { ApiKeysPage } from "../pages/api-keys-page.js";
import { PluginsPage } from "../pages/plugins-page.js";
import { PermissionsPage } from "../pages/permissions-page.js";
import { RolesPage } from "../pages/roles-page.js";
import { SettingsPage } from "../pages/settings-page.js";
import { UsersPage } from "../pages/users-page.js";
import type { RenderableAdminContribution } from "../runtime/admin-route-runtime.js";

/**
 * Official contributions define the baseline admin surface shipped by the CMS.
 * Instance-specific modules are merged later during bootstrap.
 */
export function createOfficialAdminContributions(input: {
  pluginCount: number;
  capabilityCount: number;
  systemStateLabel: string;
}): readonly RenderableAdminContribution[] {
  return [
    {
      pluginId: "kernel",
      displayName: "Kernel",
      displayNameKey: "official.plugin.kernel.display_name",
      routes: [
        {
          id: "dashboard",
          path: "/",
          pluginId: "kernel",
          title: "Overview",
          titleKey: "official.route.dashboard.title",
          summary: "Runtime health, plugin discovery, and shell-level operational insight.",
          summaryKey: "official.route.dashboard.summary",
          order: 0,
          render: createDashboardRender(input)
        }
      ],
      navigation: [
        {
          id: "nav-dashboard",
          routeId: "dashboard",
          title: "Overview",
          titleKey: "official.nav.dashboard.title",
          icon: "layout-dashboard",
          group: "Core",
          groupKey: "official.nav.group.core",
          badge: "SYS",
          order: 0
        }
      ]
    },
    {
      pluginId: "core-pack",
      displayName: "Core Pack",
      displayNameKey: "official.plugin.core_pack.display_name",
      routes: [
        {
          id: "plugins",
          path: "/plugins",
          pluginId: "kernel",
          title: "Plugins",
          titleKey: "official.route.plugins.title",
          summary: "Installed plugin inventory, runtime operations, and diagnostics.",
          summaryKey: "official.route.plugins.summary",
          order: 5,
          guards: [{ pluginId: "core-pack", capability: "plugins.read" }],
          render: () => <PluginsPage />
        },
        {
          id: "users",
          path: "/users",
          pluginId: "core-pack",
          title: "Users",
          titleKey: "official.route.users.title",
          summary: "User registry, account lifecycle, and operator tooling.",
          summaryKey: "official.route.users.summary",
          order: 10,
          guards: [{ pluginId: "core-pack", capability: "users.read" }],
          render: () => <UsersPage />
        },
        {
          id: "roles",
          path: "/roles",
          pluginId: "core-pack",
          title: "Roles",
          titleKey: "official.route.roles.title",
          summary: "Role catalog, embedded grants, and policy rule management.",
          summaryKey: "official.route.roles.summary",
          order: 20,
          guards: [{ pluginId: "core-pack", capability: "roles.read" }],
          render: () => <RolesPage />
        },
        {
          id: "permissions",
          path: "/permissions",
          pluginId: "core-pack",
          title: "Permissions",
          titleKey: "official.route.permissions.title",
          summary: "Canonical permission keys and plugin-contributed permission registry.",
          summaryKey: "official.route.permissions.summary",
          order: 30,
          guards: [{ pluginId: "core-pack", capability: "permissions.read" }],
          render: () => <PermissionsPage />
        },
        {
          id: "settings",
          path: "/settings",
          pluginId: "core-pack",
          title: "Settings",
          titleKey: "official.route.settings.title",
          summary: "Plugin configuration explorer driven by definitions and resolved values.",
          summaryKey: "official.route.settings.summary",
          order: 40,
          guards: [{ pluginId: "core-pack", capability: "settings.read" }],
          render: () => <SettingsPage />
        },
        {
          id: "api-keys",
          path: "/api-keys",
          pluginId: "core-pack",
          title: "API Keys",
          titleKey: "official.route.api_keys.title",
          summary: "Machine identities for integrations, jobs, and external backoffices.",
          summaryKey: "official.route.api_keys.summary",
          order: 50,
          guards: [{ pluginId: "core-pack", capability: "api_keys.read" }],
          render: () => <ApiKeysPage />
        }
      ],
      navigation: [
        {
          id: "nav-plugins",
          routeId: "plugins",
          title: "Plugins",
          titleKey: "official.nav.plugins.title",
          icon: "plug-zap",
          group: "Core",
          groupKey: "official.nav.group.core",
          badge: "OPS",
          order: 5
        },
        {
          id: "nav-users",
          routeId: "users",
          title: "Users",
          titleKey: "official.nav.users.title",
          icon: "users",
          group: "Identity",
          groupKey: "official.nav.group.identity",
          badge: "IAM",
          order: 10
        },
        {
          id: "nav-roles",
          routeId: "roles",
          title: "Roles",
          titleKey: "official.nav.roles.title",
          icon: "shield-check",
          group: "Identity",
          groupKey: "official.nav.group.identity",
          badge: "IAM",
          order: 20
        },
        {
          id: "nav-permissions",
          routeId: "permissions",
          title: "Permissions",
          titleKey: "official.nav.permissions.title",
          icon: "folder-cog",
          group: "Identity",
          groupKey: "official.nav.group.identity",
          badge: "IAM",
          order: 30
        },
        {
          id: "nav-settings",
          routeId: "settings",
          title: "Settings",
          titleKey: "official.nav.settings.title",
          icon: "settings-2",
          group: "Configuration",
          groupKey: "official.nav.group.configuration",
          badge: "CFG",
          order: 40
        },
        {
          id: "nav-api-keys",
          routeId: "api-keys",
          title: "API Keys",
          titleKey: "official.nav.api_keys.title",
          icon: "key-round",
          group: "Configuration",
          groupKey: "official.nav.group.configuration",
          badge: "SEC",
          order: 50
        }
      ]
    }
  ];
}
