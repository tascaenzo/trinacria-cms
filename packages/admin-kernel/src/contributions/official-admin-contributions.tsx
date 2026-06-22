import { createDashboardRender } from "../pages/dashboard-page.js";
import type { ReactNode } from "react";
import { PluginContributionsPage } from "../pages/plugin-contributions-page.js";
import { PluginsPage } from "../pages/plugins-page.js";
import { ProfilePage } from "../pages/profile-page.js";
import { SettingsPage } from "../pages/settings-page.js";
import type {
  AdminExtensionManifest,
  AdminNavigationItem,
  AdminResourceDefinition,
  AdminRouteDefinition,
  AdminSettingsSectionDefinition
} from "../contracts.js";
import { renderDeclarativeAdminPage } from "../declarative/components/declarative-page.js";
import { normalizeSafeAdminExtensionManifests } from "../runtime/admin-extension-manifest.js";
import type {
  AdminPageRenderContext,
  RenderableAdminContribution,
  RenderableAdminRoute
} from "../runtime/admin-route-runtime.js";

const CORE_PACK_READONLY_PERMISSION_KEYS = [
  "core-pack:plugins:read",
  "core-pack:users:read",
  "core-pack:users:write",
  "core-pack:roles:read",
  "core-pack:roles:write",
  "core-pack:permissions:read",
  "core-pack:permissions:write",
  "core-pack:api_keys:read",
  "core-pack:api_keys:write",
  "core-pack:settings:read",
  "core-pack:settings:write",
  "core-pack:settings.secrets:read",
  "core-pack:settings.secrets:write"
] as const;

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
    mode: "declarative",
    kind: "resource",
    guards: [{ pluginId: "core-pack", capability: "users.read" }],
    titleKey: "official.route.users.title",
    summary: "User registry, account lifecycle, and operator tooling.",
    summaryKey: "official.route.users.summary",
    data: {
      endpoint: {
        method: "GET",
        path: "/v1/users"
      },
      valuePath: "data",
      policy: {
        allowedPathPrefixes: ["/admin", "/v1"]
      }
    },
    render: renderDeclarativeAdminPage
  },
  roles: {
    mode: "declarative",
    kind: "resource",
    guards: [{ pluginId: "core-pack", capability: "roles.read" }],
    titleKey: "official.route.roles.title",
    summary: "Role catalog, embedded grants, and policy rule management.",
    summaryKey: "official.route.roles.summary",
    data: {
      endpoint: {
        method: "GET",
        path: "/v1/roles"
      },
      valuePath: "data",
      policy: {
        allowedPathPrefixes: ["/admin", "/v1"]
      }
    },
    render: renderDeclarativeAdminPage
  },
  permissions: {
    mode: "declarative",
    kind: "resource",
    guards: [{ pluginId: "core-pack", capability: "permissions.read" }],
    titleKey: "official.route.permissions.title",
    summary: "Canonical permission keys and plugin-contributed permission registry.",
    summaryKey: "official.route.permissions.summary",
    data: {
      endpoint: {
        method: "GET",
        path: "/v1/permissions"
      },
      valuePath: "data",
      policy: {
        allowedPathPrefixes: ["/admin", "/v1"]
      }
    },
    render: renderDeclarativeAdminPage
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
    mode: "declarative",
    kind: "resource",
    guards: [{ pluginId: "core-pack", capability: "api_keys.read" }],
    titleKey: "official.route.api_keys.title",
    summary: "Machine identities for integrations, jobs, and external backoffices.",
    summaryKey: "official.route.api_keys.summary",
    data: {
      endpoint: {
        method: "GET",
        path: "/v1/api-keys"
      },
      valuePath: "data",
      policy: {
        allowedPathPrefixes: ["/admin", "/v1"]
      }
    },
    render: renderDeclarativeAdminPage
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
    groupKey: "official.nav.group.core"
  },
  "nav-plugin-contributions": {
    guards: [{ pluginId: "core-pack", capability: "plugins.read" }],
    titleKey: "official.nav.plugin_contributions.title",
    icon: "puzzle",
    group: "Core",
    groupKey: "official.nav.group.core"
  },
  "nav-users": {
    guards: [{ pluginId: "core-pack", capability: "users.read" }],
    titleKey: "official.nav.users.title",
    icon: "users",
    group: "Identity",
    groupKey: "official.nav.group.identity"
  },
  "nav-roles": {
    guards: [{ pluginId: "core-pack", capability: "roles.read" }],
    titleKey: "official.nav.roles.title",
    icon: "shield-check",
    group: "Identity",
    groupKey: "official.nav.group.identity"
  },
  "nav-permissions": {
    guards: [{ pluginId: "core-pack", capability: "permissions.read" }],
    titleKey: "official.nav.permissions.title",
    icon: "folder-cog",
    group: "Identity",
    groupKey: "official.nav.group.identity"
  },
  "nav-settings": {
    guards: [{ pluginId: "core-pack", capability: "settings.read" }],
    titleKey: "official.nav.settings.title",
    icon: "settings-2",
    group: "Configuration",
    groupKey: "official.nav.group.configuration"
  },
  "nav-api-keys": {
    guards: [{ pluginId: "core-pack", capability: "api_keys.read" }],
    titleKey: "official.nav.api_keys.title",
    icon: "key-round",
    group: "Configuration",
    groupKey: "official.nav.group.configuration"
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
    actions: [
      {
        id: "create-user",
        intent: "create",
        title: "Create user",
        titleKey: "users.actions.create",
        endpoint: { method: "POST", path: "/v1/users" },
        policy: { allowedPathPrefixes: ["/admin", "/v1"] },
        guards: [{ pluginId: "core-pack", capability: "users.write" }],
        input: {
          schema: {
            type: "object",
            properties: {
              email: { type: "string", labelKey: "auth.login.email_label" },
              firstName: { type: "string", labelKey: "common.form.first_name" },
              lastName: { type: "string", labelKey: "common.form.last_name" }
            },
            required: ["email", "firstName", "lastName"]
          }
        }
      },
      {
        id: "update-user-profile",
        intent: "update",
        title: "Edit",
        titleKey: "common.actions.edit",
        endpoint: { method: "PATCH", path: "/v1/users/:id" },
        policy: { allowedPathPrefixes: ["/admin", "/v1"] },
        guards: [{ pluginId: "core-pack", capability: "users.write" }],
        input: {
          schema: {
            type: "object",
            properties: {
              firstName: { type: "string", labelKey: "common.form.first_name" },
              lastName: { type: "string", labelKey: "common.form.last_name" },
              status: {
                type: "string",
                enum: ["active", "suspended"],
                labelKey: "common.table.status"
              }
            },
            required: ["firstName", "lastName", "status"]
          }
        }
      }
    ],
    fields: [
      {
        key: "firstName",
        label: "First name",
        labelKey: "common.form.first_name",
        primary: true,
        table: true,
        form: true
      },
      {
        key: "lastName",
        label: "Last name",
        labelKey: "common.form.last_name",
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
    actions: [
      {
        id: "create-role",
        intent: "create",
        title: "Create role",
        titleKey: "roles.actions.create",
        endpoint: { method: "POST", path: "/v1/roles" },
        policy: { allowedPathPrefixes: ["/admin", "/v1"] },
        guards: [{ pluginId: "core-pack", capability: "roles.write" }],
        input: {
          schema: {
            type: "object",
            properties: {
              code: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              permissions: {
                type: "array",
                items: { type: "string" },
                "x-options": {
                  endpoint: { method: "GET", path: "/v1/permissions" },
                  valuePath: "data",
                  valueField: "key",
                  labelField: "key",
                  descriptionField: "displayName",
                  metaField: "status"
                }
              }
            },
            required: ["code", "name"]
          }
        }
      },
      {
        id: "update-role",
        intent: "update",
        title: "Edit",
        titleKey: "common.actions.edit",
        endpoint: { method: "PATCH", path: "/v1/roles/:id" },
        policy: { allowedPathPrefixes: ["/admin", "/v1"] },
        guards: [{ pluginId: "core-pack", capability: "roles.write" }],
        input: {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              status: { type: "string", enum: ["active", "disabled"] },
              permissions: {
                type: "array",
                items: { type: "string" },
                "x-options": {
                  endpoint: { method: "GET", path: "/v1/permissions" },
                  valuePath: "data",
                  valueField: "key",
                  labelField: "key",
                  descriptionField: "displayName",
                  metaField: "status"
                }
              }
            },
            required: ["name"]
          }
        }
      }
    ],
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
        kind: "tags",
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
    actions: [
      {
        id: "create-permission",
        intent: "create",
        title: "Create permission",
        titleKey: "permissions.actions.create",
        endpoint: { method: "POST", path: "/v1/permissions" },
        policy: { allowedPathPrefixes: ["/admin", "/v1"] },
        guards: [{ pluginId: "core-pack", capability: "permissions.write" }],
        input: {
          schema: {
            type: "object",
            properties: {
              key: { type: "string" },
              displayName: { type: "string" },
              description: { type: "string" }
            },
            required: ["key", "displayName"]
          }
        }
      },
      {
        id: "update-permission",
        intent: "update",
        title: "Edit",
        titleKey: "common.actions.edit",
        endpoint: { method: "PATCH", path: "/v1/permissions/:id" },
        policy: { allowedPathPrefixes: ["/admin", "/v1"] },
        guards: [{ pluginId: "core-pack", capability: "permissions.write" }],
        recordGuards: [
          {
            field: "key",
            operator: "notIn",
            values: CORE_PACK_READONLY_PERMISSION_KEYS
          }
        ],
        input: {
          schema: {
            type: "object",
            properties: {
              displayName: { type: "string" },
              description: { type: "string" },
              status: { type: "string", enum: ["active", "disabled"] }
            },
            required: ["displayName"]
          }
        }
      }
    ],
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
    actions: [
      {
        id: "create-api-key",
        intent: "create",
        title: "Create API key",
        titleKey: "api_keys.actions.issue",
        endpoint: { method: "POST", path: "/v1/api-keys" },
        policy: { allowedPathPrefixes: ["/admin", "/v1"] },
        guards: [{ pluginId: "core-pack", capability: "api_keys.write" }],
        input: {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              kind: { type: "string" },
              roleCodes: { type: "array", items: { type: "string" } },
              permissionKeys: { type: "array", items: { type: "string" } },
              expiresAt: { type: "string" }
            },
            required: ["name"]
          }
        }
      },
      {
        id: "rotate-api-key",
        intent: "update",
        title: "Rotate",
        titleKey: "common.actions.rotate",
        endpoint: { method: "POST", path: "/v1/api-keys/:id/rotate" },
        policy: { allowedPathPrefixes: ["/admin", "/v1"] },
        guards: [{ pluginId: "core-pack", capability: "api_keys.write" }],
        input: {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              roleCodes: { type: "array", items: { type: "string" } },
              permissionKeys: { type: "array", items: { type: "string" } },
              expiresAt: { type: "string" }
            }
          }
        }
      },
      {
        id: "revoke-api-key",
        intent: "delete",
        title: "Revoke",
        titleKey: "common.actions.revoke",
        endpoint: { method: "POST", path: "/v1/api-keys/:id/revoke" },
        policy: { allowedPathPrefixes: ["/admin", "/v1"] },
        guards: [{ pluginId: "core-pack", capability: "api_keys.write" }],
        input: {
          schema: {
            type: "object",
            properties: {
              reason: { type: "string" }
            }
          }
        }
      }
    ],
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
    ]
  }
};

const OFFICIAL_CORE_SETTINGS_SECTION_META: Record<
  string,
  Partial<AdminSettingsSectionDefinition>
> = {
  "core-pack:core-pack-general-settings": {
    titleKey: "settings.section.general.title",
    summary: "Site identity and localization settings used across the backoffice.",
    summaryKey: "settings.section.general.summary",
    order: 10,
    settingKeys: [
      "core-pack:site:name",
      "core-pack:site:url",
      "core-pack:cms:locale",
      "core-pack:cms:timezone"
    ]
  },
  "core-pack:core-pack-branding-settings": {
    titleKey: "settings.section.branding.title",
    summary: "Backoffice-facing brand text and logo references.",
    summaryKey: "settings.section.branding.summary",
    order: 20,
    settingKeys: ["core-pack:branding:tagline", "core-pack:branding:logo_url"]
  },
  "core-pack:core-pack-auth-settings": {
    titleKey: "settings.section.auth.title",
    summary: "Session, login lockout, cookie, and plugin-auth timing settings.",
    summaryKey: "settings.section.auth.summary",
    order: 30,
    category: "auth"
  },
  "core-pack:core-pack-security-settings": {
    titleKey: "settings.section.security.title",
    summary: "Secret handling and encryption policy settings.",
    summaryKey: "settings.section.security.summary",
    order: 40,
    category: "security"
  },
  "core-pack:core-pack-cache-settings": {
    titleKey: "settings.section.cache.title",
    summary: "Cache adapter and Redis runtime settings.",
    summaryKey: "settings.section.cache.summary",
    order: 50,
    category: "cache"
  },
  "core-pack:core-pack-settings-catalog": {
    titleKey: "settings.section.catalog.title",
    summary: "Raw owner-aware settings definitions and resolved values.",
    summaryKey: "settings.section.catalog.summary",
    order: 900,
    category: "settings"
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
    settings: contribution.settings?.map((section) => enrichSettingsSection(section))
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

function enrichSettingsSection(
  section: AdminSettingsSectionDefinition
): AdminSettingsSectionDefinition {
  return {
    ...section,
    ...OFFICIAL_CORE_SETTINGS_SECTION_META[`${section.pluginId}:${section.id}`]
  };
}
