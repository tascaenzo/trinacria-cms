import { createDashboardRender } from "../pages/dashboard-page.js";
import { ApiKeysPage } from "../pages/api-keys-page.js";
import { PluginContributionsPage } from "../pages/plugin-contributions-page.js";
import { PluginsPage } from "../pages/plugins-page.js";
import { PermissionsPage } from "../pages/permissions-page.js";
import { RolesPage } from "../pages/roles-page.js";
import { SettingsPage } from "../pages/settings-page.js";
import { UsersPage } from "../pages/users-page.js";
import type { AdminResourceDefinition } from "../contracts.js";
import type { RenderableAdminContribution } from "../runtime/admin-route-runtime.js";

const OFFICIAL_CORE_RESOURCES: readonly AdminResourceDefinition[] = [
  {
    id: "core-pack.users",
    pluginId: "core-pack",
    entityName: "users",
    routeId: "users",
    title: "Users",
    titleKey: "official.resource.users.title",
    summary: "User records managed by the core identity module.",
    summaryKey: "official.resource.users.summary",
    order: 10,
    capabilities: {
      list: "users.read",
      create: "users.write",
      update: "users.write"
    },
    fields: [
      {
        key: "displayName",
        label: "Display name",
        labelKey: "common.form.display_name",
        primary: true,
        table: true,
        form: true
      },
      { key: "email", label: "Email", labelKey: "auth.login.email_label", table: true, form: true },
      {
        key: "status",
        label: "Status",
        labelKey: "common.table.status",
        kind: "status",
        table: true
      },
      {
        key: "updatedAt",
        label: "Updated",
        labelKey: "common.table.updated",
        kind: "datetime",
        table: true
      }
    ],
    guards: [{ pluginId: "core-pack", capability: "users.read" }]
  },
  {
    id: "core-pack.roles",
    pluginId: "core-pack",
    entityName: "roles",
    routeId: "roles",
    title: "Roles",
    titleKey: "official.resource.roles.title",
    summary: "Role records and embedded permission grants.",
    summaryKey: "official.resource.roles.summary",
    order: 20,
    capabilities: {
      list: "roles.read",
      create: "roles.write",
      update: "roles.write"
    },
    fields: [
      {
        key: "name",
        label: "Name",
        labelKey: "roles.form.name",
        primary: true,
        table: true,
        form: true
      },
      { key: "code", label: "Code", labelKey: "roles.form.code", table: true, form: true },
      {
        key: "permissions",
        label: "Permissions",
        labelKey: "roles.table.permissions",
        kind: "json",
        table: true,
        form: true
      },
      {
        key: "status",
        label: "Status",
        labelKey: "common.table.status",
        kind: "status",
        table: true
      }
    ],
    guards: [{ pluginId: "core-pack", capability: "roles.read" }]
  },
  {
    id: "core-pack.permissions",
    pluginId: "core-pack",
    entityName: "permissions",
    routeId: "permissions",
    title: "Permissions",
    titleKey: "official.resource.permissions.title",
    summary: "Canonical permission records contributed by plugins.",
    summaryKey: "official.resource.permissions.summary",
    order: 30,
    capabilities: {
      list: "permissions.read",
      create: "permissions.write",
      update: "permissions.write"
    },
    fields: [
      {
        key: "displayName",
        label: "Display name",
        labelKey: "common.form.display_name",
        primary: true,
        table: true,
        form: true
      },
      { key: "key", label: "Key", labelKey: "common.form.key", table: true, form: true },
      { key: "sourcePluginId", label: "Source", labelKey: "permissions.table.source", table: true },
      {
        key: "status",
        label: "Status",
        labelKey: "common.table.status",
        kind: "status",
        table: true
      }
    ],
    guards: [{ pluginId: "core-pack", capability: "permissions.read" }]
  },
  {
    id: "core-pack.api-keys",
    pluginId: "core-pack",
    entityName: "api_keys",
    routeId: "api-keys",
    title: "API Keys",
    titleKey: "official.resource.api_keys.title",
    summary: "Machine identity records for integrations and automation.",
    summaryKey: "official.resource.api_keys.summary",
    order: 50,
    capabilities: {
      list: "api_keys.read",
      create: "api_keys.write",
      update: "api_keys.write"
    },
    fields: [
      {
        key: "name",
        label: "Name",
        labelKey: "common.form.name",
        primary: true,
        table: true,
        form: true
      },
      { key: "keyPrefix", label: "Key", labelKey: "common.table.key", table: true },
      { key: "kind", label: "Kind", labelKey: "api_keys.table.kind", table: true, form: true },
      {
        key: "status",
        label: "Status",
        labelKey: "common.table.status",
        kind: "status",
        table: true
      }
    ],
    guards: [{ pluginId: "core-pack", capability: "api_keys.read" }]
  }
];

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
          id: "plugin-contributions",
          path: "/plugin-contributions",
          pluginId: "kernel",
          title: "Plugin contributions",
          titleKey: "official.route.plugin_contributions.title",
          summary: "Manifest-derived entity, settings, event, and admin contribution catalog.",
          summaryKey: "official.route.plugin_contributions.summary",
          order: 6,
          guards: [{ pluginId: "core-pack", capability: "plugins.read" }],
          render: () => <PluginContributionsPage />
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
      resources: OFFICIAL_CORE_RESOURCES,
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
          id: "nav-plugin-contributions",
          routeId: "plugin-contributions",
          title: "Contributions",
          titleKey: "official.nav.plugin_contributions.title",
          icon: "blocks",
          group: "Core",
          groupKey: "official.nav.group.core",
          badge: "M4",
          order: 6
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
