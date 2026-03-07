import { createDashboardRender } from "../pages/dashboard-page.js";
import { ApiKeysPage } from "../pages/api-keys-page.js";
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
      routes: [
        {
          id: "dashboard",
          path: "/",
          pluginId: "kernel",
          title: "Overview",
          summary: "Runtime health, plugin discovery, and shell-level operational insight.",
          order: 0,
          render: createDashboardRender(input),
        },
      ],
      navigation: [
        {
          id: "nav-dashboard",
          routeId: "dashboard",
          title: "Overview",
          icon: "layout-dashboard",
          group: "Core",
          badge: "SYS",
          order: 0,
        },
      ],
    },
    {
      pluginId: "core-pack",
      displayName: "Core Pack",
      routes: [
        {
          id: "users",
          path: "/users",
          pluginId: "core-pack",
          title: "Users",
          summary: "User registry, account lifecycle, and operator tooling.",
          order: 10,
          guards: [{ pluginId: "core-pack", capability: "users.read" }],
          render: () => <UsersPage />,
        },
        {
          id: "roles",
          path: "/roles",
          pluginId: "core-pack",
          title: "Roles",
          summary: "Role catalog, embedded grants, and policy rule management.",
          order: 20,
          guards: [{ pluginId: "core-pack", capability: "roles.read" }],
          render: () => <RolesPage />,
        },
        {
          id: "permissions",
          path: "/permissions",
          pluginId: "core-pack",
          title: "Permissions",
          summary: "Canonical permission keys and plugin-contributed permission registry.",
          order: 30,
          guards: [{ pluginId: "core-pack", capability: "permissions.read" }],
          render: () => <PermissionsPage />,
        },
        {
          id: "settings",
          path: "/settings",
          pluginId: "core-pack",
          title: "Settings",
          summary: "Plugin configuration explorer driven by definitions and resolved values.",
          order: 40,
          guards: [{ pluginId: "core-pack", capability: "settings.read" }],
          render: () => <SettingsPage />,
        },
        {
          id: "api-keys",
          path: "/api-keys",
          pluginId: "core-pack",
          title: "API Keys",
          summary: "Machine identities for integrations, jobs, and external backoffices.",
          order: 50,
          guards: [{ pluginId: "core-pack", capability: "api_keys.read" }],
          render: () => <ApiKeysPage />,
        },
      ],
      navigation: [
        {
          id: "nav-users",
          routeId: "users",
          title: "Users",
          icon: "users",
          group: "Identity",
          badge: "IAM",
          order: 10,
        },
        {
          id: "nav-roles",
          routeId: "roles",
          title: "Roles",
          icon: "shield-check",
          group: "Identity",
          badge: "IAM",
          order: 20,
        },
        {
          id: "nav-permissions",
          routeId: "permissions",
          title: "Permissions",
          icon: "folder-cog",
          group: "Identity",
          badge: "IAM",
          order: 30,
        },
        {
          id: "nav-settings",
          routeId: "settings",
          title: "Settings",
          icon: "settings-2",
          group: "Configuration",
          badge: "CFG",
          order: 40,
        },
        {
          id: "nav-api-keys",
          routeId: "api-keys",
          title: "API Keys",
          icon: "key-round",
          group: "Configuration",
          badge: "SEC",
          order: 50,
        },
      ],
    },
  ];
}
