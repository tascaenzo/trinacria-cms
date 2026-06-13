import { createDashboardRender } from "../pages/dashboard-page.js";
import type { ReactNode } from "react";
import { ApiKeysPage } from "../pages/api-keys-page.js";
import { PluginContributionsPage } from "../pages/plugin-contributions-page.js";
import { PluginsPage } from "../pages/plugins-page.js";
import { PermissionsPage } from "../pages/permissions-page.js";
import { ProfilePage } from "../pages/profile-page.js";
import { RolesPage } from "../pages/roles-page.js";
import { SettingsPage } from "../pages/settings-page.js";
import { UsersPage } from "../pages/users-page.js";
import type {
  AdminExtensionManifest,
  AdminNavigationItem,
  AdminResourceDefinition,
  AdminRouteDefinition
} from "../contracts.js";
import { normalizeSafeAdminExtensionManifests } from "../runtime/admin-extension-manifest.js";
import type {
  AdminPageRenderContext,
  RenderableAdminContribution,
  RenderableAdminRoute
} from "../runtime/admin-route-runtime.js";

const OFFICIAL_CORE_ROUTE_META: Record<
  string,
  Partial<AdminRouteDefinition> & { render: (context: AdminPageRenderContext) => ReactNode }
> = {
  plugins: {
    guards: [{ pluginId: "core-pack", capability: "plugins.read" }],
    titleKey: "official.route.plugins.title",
    summary: "Installed plugin inventory, runtime operations, and diagnostics.",
    summaryKey: "official.route.plugins.summary",
    render: () => <PluginsPage />
  },
  "plugin-contributions": {
    guards: [{ pluginId: "core-pack", capability: "plugins.read" }],
    titleKey: "official.route.plugin_contributions.title",
    summary: "Manifest-derived entity, settings, event, and admin contribution catalog.",
    summaryKey: "official.route.plugin_contributions.summary",
    render: () => <PluginContributionsPage />
  },
  users: {
    kind: "resource",
    guards: [{ pluginId: "core-pack", capability: "users.read" }],
    titleKey: "official.route.users.title",
    summary: "User registry, account lifecycle, and operator tooling.",
    summaryKey: "official.route.users.summary",
    render: () => <UsersPage />
  },
  roles: {
    kind: "resource",
    guards: [{ pluginId: "core-pack", capability: "roles.read" }],
    titleKey: "official.route.roles.title",
    summary: "Role catalog, embedded grants, and policy rule management.",
    summaryKey: "official.route.roles.summary",
    render: () => <RolesPage />
  },
  permissions: {
    kind: "resource",
    guards: [{ pluginId: "core-pack", capability: "permissions.read" }],
    titleKey: "official.route.permissions.title",
    summary: "Canonical permission keys and plugin-contributed permission registry.",
    summaryKey: "official.route.permissions.summary",
    render: () => <PermissionsPage />
  },
  settings: {
    guards: [{ pluginId: "core-pack", capability: "settings.read" }],
    titleKey: "official.route.settings.title",
    summary: "Plugin configuration explorer driven by definitions and resolved values.",
    summaryKey: "official.route.settings.summary",
    render: (context) => (
      <SettingsPage
        sectionContext={{
          runtimePlugins: context.runtimePlugins,
          capabilityIndex: context.capabilityIndex,
          routes: context.routes,
          resources: context.resources,
          settings: context.settings,
          widgets: context.widgets,
          locale: context.locale,
          t: context.t
        }}
        settings={context.settings}
      />
    )
  },
  "api-keys": {
    kind: "resource",
    guards: [{ pluginId: "core-pack", capability: "api_keys.read" }],
    titleKey: "official.route.api_keys.title",
    summary: "Machine identities for integrations, jobs, and external backoffices.",
    summaryKey: "official.route.api_keys.summary",
    render: () => <ApiKeysPage />
  }
};

const OFFICIAL_CORE_COMPONENT_ROUTE_META: Record<string, keyof typeof OFFICIAL_CORE_ROUTE_META> = {
  "core-pack.plugins": "plugins",
  "core-pack.plugin-contributions": "plugin-contributions",
  "core-pack.users": "users",
  "core-pack.roles": "roles",
  "core-pack.permissions": "permissions",
  "core-pack.settings": "settings",
  "core-pack.api-keys": "api-keys"
};

const OFFICIAL_CORE_NAV_META: Record<string, Partial<AdminNavigationItem>> = {
  "nav-plugins": {
    guards: [{ pluginId: "core-pack", capability: "plugins.read" }],
    titleKey: "official.nav.plugins.title",
    icon: "plug",
    group: "Core",
    groupKey: "official.nav.group.core",
    badge: "OPS"
  },
  "nav-plugin-contributions": {
    guards: [{ pluginId: "core-pack", capability: "plugins.read" }],
    titleKey: "official.nav.plugin_contributions.title",
    icon: "puzzle",
    group: "Core",
    groupKey: "official.nav.group.core",
    badge: "M4"
  },
  "nav-users": {
    guards: [{ pluginId: "core-pack", capability: "users.read" }],
    titleKey: "official.nav.users.title",
    icon: "users",
    group: "Identity",
    groupKey: "official.nav.group.identity",
    badge: "IAM"
  },
  "nav-roles": {
    guards: [{ pluginId: "core-pack", capability: "roles.read" }],
    titleKey: "official.nav.roles.title",
    icon: "shield-check",
    group: "Identity",
    groupKey: "official.nav.group.identity",
    badge: "IAM"
  },
  "nav-permissions": {
    guards: [{ pluginId: "core-pack", capability: "permissions.read" }],
    titleKey: "official.nav.permissions.title",
    icon: "folder-cog",
    group: "Identity",
    groupKey: "official.nav.group.identity",
    badge: "IAM"
  },
  "nav-settings": {
    guards: [{ pluginId: "core-pack", capability: "settings.read" }],
    titleKey: "official.nav.settings.title",
    icon: "settings-2",
    group: "Configuration",
    groupKey: "official.nav.group.configuration",
    badge: "CFG"
  },
  "nav-api-keys": {
    guards: [{ pluginId: "core-pack", capability: "api_keys.read" }],
    titleKey: "official.nav.api_keys.title",
    icon: "key-round",
    group: "Configuration",
    groupKey: "official.nav.group.configuration",
    badge: "SEC"
  }
};

const OFFICIAL_CORE_RESOURCE_META: Record<string, Partial<AdminResourceDefinition>> = {
  "core-pack:users": {
    guards: [{ pluginId: "core-pack", capability: "users.read" }],
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
      { key: "status", label: "Status", labelKey: "common.table.status", kind: "status", table: true },
      {
        key: "updatedAt",
        label: "Updated",
        labelKey: "common.table.updated",
        kind: "datetime",
        table: true
      }
    ]
  },
  "core-pack:roles": {
    guards: [{ pluginId: "core-pack", capability: "roles.read" }],
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
      { key: "status", label: "Status", labelKey: "common.table.status", kind: "status", table: true }
    ]
  },
  "core-pack:permissions": {
    guards: [{ pluginId: "core-pack", capability: "permissions.read" }],
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
      { key: "status", label: "Status", labelKey: "common.table.status", kind: "status", table: true }
    ]
  },
  "core-pack:api-keys": {
    guards: [{ pluginId: "core-pack", capability: "api_keys.read" }],
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
      { key: "status", label: "Status", labelKey: "common.table.status", kind: "status", table: true }
    ]
  }
};

/**
 * Kernel-owned contributions define only shell-level pages. Plugin-owned admin
 * pages, including core-pack, are loaded from the runtime manifest catalog.
 */
export function createOfficialAdminContributions(input: {
  pluginCount: number;
  capabilityCount: number;
  systemStateLabel: string;
}): readonly RenderableAdminContribution[] {
  const manifests: readonly AdminExtensionManifest[] = [
    {
      pluginId: "kernel",
      displayName: "Kernel",
      displayNameKey: "official.plugin.kernel.display_name",
      admin: {
        pages: [
          {
            id: "dashboard",
            path: "/",
            pluginId: "kernel",
            mode: "react",
            kind: "dashboard",
            title: "Overview",
            titleKey: "official.route.dashboard.title",
            summary: "Runtime health, plugin discovery, and shell-level operational insight.",
            summaryKey: "official.route.dashboard.summary",
            order: 0
          },
          {
            id: "profile",
            path: "/profile",
            pluginId: "kernel",
            mode: "react",
            kind: "custom",
            title: "Profile",
            titleKey: "official.route.profile.title",
            summary: "Current operator profile, roles, permissions, and session model.",
            summaryKey: "official.route.profile.summary",
            hideShellHeader: true,
            order: 1
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
      }
    }
  ];

  return withOfficialAdminRouteRenderers(
    normalizeSafeAdminExtensionManifests(manifests).map((contribution) => ({
      ...contribution,
      routes: contribution.routes.map((route) => {
        if (route.id === "dashboard") {
          return { ...route, render: createDashboardRender(input) };
        }
        if (route.id === "profile") {
          return { ...route, render: () => <ProfilePage /> };
        }
        return route;
      })
    }))
  );
}

export function withOfficialAdminRouteRenderers(
  contributions: readonly RenderableAdminContribution[]
): readonly RenderableAdminContribution[] {
  return contributions.map((contribution) => ({
    ...contribution,
    routes: contribution.routes.map((route) => enrichRoute(route)),
    navigation: contribution.navigation.map((item) => enrichNavigationItem(item)),
    resources: contribution.resources?.map((resource) => enrichResource(resource)),
    widgets: contribution.widgets,
    settings: contribution.settings
  }));
}

function enrichRoute(route: RenderableAdminRoute): RenderableAdminRoute {
  const meta = getRouteMeta(route);
  if (!meta) {
    return route;
  }

  const { render, ...routeMeta } = meta;
  return {
    ...route,
    ...routeMeta,
    render
  };
}

function getRouteMeta(route: AdminRouteDefinition) {
  const componentRouteId = route.componentRef
    ? OFFICIAL_CORE_COMPONENT_ROUTE_META[route.componentRef]
    : undefined;
  return OFFICIAL_CORE_ROUTE_META[componentRouteId ?? route.id];
}

function enrichNavigationItem(item: AdminNavigationItem): AdminNavigationItem {
  return {
    ...item,
    ...OFFICIAL_CORE_NAV_META[item.id]
  };
}

function enrichResource(resource: AdminResourceDefinition): AdminResourceDefinition {
  return {
    ...resource,
    ...OFFICIAL_CORE_RESOURCE_META[`${resource.pluginId}:${resource.entityName}`]
  };
}
