import { createDashboardRender } from "../pages/dashboard-page.js";
import { ProfilePage } from "../pages/profile-page.js";
import type {
  AdminExtensionManifest,
  AdminNavigationItem,
  AdminResourceDefinition,
  AdminRouteDefinition,
  AdminSettingsSectionDefinition
} from "../contracts.js";
import { normalizeSafeAdminExtensionManifests } from "../runtime/admin-extension-manifest.js";
import type {
  RenderableAdminContribution,
  RenderableAdminRoute
} from "../runtime/admin-route-runtime.js";
import { OFFICIAL_CORE_NAV_META } from "./core-navigation-contribution-meta.js";
import {
  OFFICIAL_CORE_COMPONENT_ROUTE_META,
  OFFICIAL_CORE_ROUTE_META
} from "./core-route-contribution-meta.js";
import { OFFICIAL_CORE_RESOURCE_META } from "./core-resource-contribution-meta.js";
import { OFFICIAL_CORE_SETTINGS_SECTION_META } from "./core-settings-contribution-meta.js";

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
