import type { ReactNode } from "react";
import type { AdminRouteDefinition } from "../contracts.js";
import { renderDeclarativeAdminPage } from "../declarative/components/declarative-page.js";
import { DeclarativeResourcePage } from "../declarative/components/declarative-resource-page.js";
import { useDeclarativeData } from "../declarative/hooks/use-declarative-data.js";
import { getRecordIdentity } from "../declarative/utils/formatting.js";
import { SettingsPage } from "../pages/settings-page.js";
import { UserAccessPanel } from "../pages/user-access-panel.js";
import type { AdminPageRenderContext } from "../runtime/admin-route-runtime.js";

export const OFFICIAL_CORE_ROUTE_META: Record<
  string,
  Partial<AdminRouteDefinition> & { render: (context: AdminPageRenderContext) => ReactNode }
> = {
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
    render: (context) => <CoreUsersPage context={context} />
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
          apiBaseUrl: context.apiBaseUrl,
          cms: context.cms,
          t: context.t
        }}
        settings={context.settings}
      />
    )
  }
};

export const OFFICIAL_CORE_COMPONENT_ROUTE_META: Record<
  string,
  keyof typeof OFFICIAL_CORE_ROUTE_META
> = {
  "core-pack.users": "users",
  "core-pack.roles": "roles",
  "core-pack.permissions": "permissions",
  "core-pack.settings": "settings"
};

function CoreUsersPage({ context }: { context: AdminPageRenderContext }) {
  const resource = context.resources.find((entry) => entry.routeId === context.route.id);
  const dataState = useDeclarativeData(context.route.data);
  return (
    <DeclarativeResourcePage
      context={context}
      resource={resource}
      dataState={dataState}
      renderDetailExtras={(record) => (
        <UserAccessPanel
          key={getRecordIdentity(record)}
          userId={getRecordIdentity(record) ?? ""}
          t={context.t}
        />
      )}
    />
  );
}
