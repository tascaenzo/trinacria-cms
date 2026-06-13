import type {
  AdminAccessGuard,
  AdminExtensionManifest,
  AdminNavigationItem,
  AdminResourceDefinition,
  AdminRouteDefinition,
  AdminRuntimePluginInfo,
  AdminSettingsSectionDefinition,
  AdminDashboardWidgetDefinition
} from "../contracts.js";
import { cms } from "./cms-sdk.js";

export interface AdminRuntimeDiscoverySnapshot {
  plugins: readonly AdminRuntimePluginInfo[];
  manifests: readonly AdminExtensionManifest[];
}

/**
 * Runtime discovery is mapped into a frontend-friendly shape so the admin
 * shell does not need backend response types spread across every screen.
 */
export async function loadRuntimePluginInfo(): Promise<readonly AdminRuntimePluginInfo[]> {
  return (await loadRuntimeDiscovery()).plugins;
}

export async function loadRuntimeDiscovery(): Promise<AdminRuntimeDiscoverySnapshot> {
  const [plugins, capabilities, contributions] = await Promise.all([
    cms.system.listInstalledPlugins(),
    cms.system.listInstalledCapabilities(),
    cms.system.listPluginContributions()
  ]);

  const capabilityMap = new Map<string, Set<string>>();
  for (const entry of capabilities.data) {
    const list = capabilityMap.get(entry.pluginId);
    if (list) {
      list.add(entry.capability);
    } else {
      capabilityMap.set(entry.pluginId, new Set([entry.capability]));
    }
  }

  const runtimePlugins = plugins.data.map((plugin) => ({
    pluginId: plugin.id,
    installed: plugin.state === "loaded",
    version: plugin.version,
    state: plugin.state,
    capabilities: Array.from(capabilityMap.get(plugin.id) ?? [])
  }));

  return {
    plugins: runtimePlugins,
    manifests: createAdminExtensionManifestsFromContributionCatalog(contributions.data)
  };
}

type ContributionCatalog = Awaited<ReturnType<typeof cms.system.listPluginContributions>>["data"];
type ContributionSnapshot = {
  pluginId: string;
  key: string;
  declaration: Record<string, unknown>;
};

function createAdminExtensionManifestsFromContributionCatalog(
  catalog: ContributionCatalog
): readonly AdminExtensionManifest[] {
  const pluginIds = new Set<string>();
  for (const surface of [
    ...catalog.admin.routes,
    ...catalog.admin.navigation,
    ...catalog.admin.resources,
    ...catalog.admin.widgets,
    ...catalog.admin.settingsSections
  ]) {
    pluginIds.add(surface.pluginId);
  }

  return Array.from(pluginIds)
    .sort()
    .map((pluginId) => {
      const routes = catalog.admin.routes
        .filter((entry) => entry.pluginId === pluginId)
        .map((entry) => toAdminRoute(entry));
      const routeIdByPath = new Map(routes.map((route) => [route.path, route.id]));

      return {
        pluginId,
        displayName: formatPluginDisplayName(pluginId),
        admin: {
          pages: routes,
          navigation: catalog.admin.navigation
            .filter((entry) => entry.pluginId === pluginId)
            .map((entry) => toAdminNavigationItem(entry, routeIdByPath))
            .filter((entry) => entry.routeId),
          dashboard: {
            widgets: catalog.admin.widgets
              .filter((entry) => entry.pluginId === pluginId)
              .map((entry) => toAdminWidget(entry))
          },
          settings: {
            sections: catalog.admin.settingsSections
              .filter((entry) => entry.pluginId === pluginId)
              .map((entry) => toAdminSettingsSection(entry))
          },
          resources: catalog.admin.resources
            .filter((entry) => entry.pluginId === pluginId)
            .map((entry) => toAdminResource(entry, routeIdByPath))
        }
      };
    });
}

function toAdminRoute(entry: ContributionSnapshot): AdminRouteDefinition {
  const declaration = entry.declaration;
  return {
    id: readString(declaration.id) ?? entry.key,
    path: readString(declaration.path) ?? `/${entry.pluginId}/${entry.key}`,
    pluginId: entry.pluginId,
    mode: "declarative",
    kind: "custom",
    title: readString(declaration.label) ?? readString(declaration.title) ?? entry.key,
    componentRef: readString(declaration.componentRef),
    order: readNumber(declaration.order),
    guards: toGuards(entry.pluginId, declaration.requiredPermission)
  };
}

function toAdminNavigationItem(
  entry: ContributionSnapshot,
  routeIdByPath: ReadonlyMap<string, string>
): AdminNavigationItem {
  const declaration = entry.declaration;
  const path = readString(declaration.path);
  const fallbackRouteId =
    readString(declaration.routeId) ?? readString(declaration.id) ?? entry.key;
  return {
    id: readString(declaration.id) ?? entry.key,
    routeId: path ? (routeIdByPath.get(path) ?? fallbackRouteId) : fallbackRouteId,
    title: readString(declaration.label) ?? readString(declaration.title) ?? entry.key,
    order: readNumber(declaration.order),
    guards: toGuards(entry.pluginId, declaration.requiredPermission)
  };
}

function toAdminWidget(entry: ContributionSnapshot): AdminDashboardWidgetDefinition {
  const declaration = entry.declaration;
  return {
    id: readString(declaration.id) ?? entry.key,
    pluginId: entry.pluginId,
    mode: "declarative",
    kind: "card",
    title: readString(declaration.label) ?? readString(declaration.title) ?? entry.key,
    guards: toGuards(entry.pluginId, declaration.requiredPermission)
  };
}

function toAdminSettingsSection(entry: ContributionSnapshot): AdminSettingsSectionDefinition {
  const declaration = entry.declaration;
  return {
    id: readString(declaration.id) ?? entry.key,
    pluginId: entry.pluginId,
    mode: "declarative",
    kind: "panel",
    title: readString(declaration.label) ?? readString(declaration.title) ?? entry.key,
    guards: toGuards(entry.pluginId, declaration.requiredPermission)
  };
}

function toAdminResource(
  entry: ContributionSnapshot,
  routeIdByPath: ReadonlyMap<string, string>
): AdminResourceDefinition {
  const declaration = entry.declaration;
  const routeBase = readString(declaration.routeBase);
  return {
    id: readString(declaration.id) ?? entry.key,
    pluginId: entry.pluginId,
    entityName: readString(declaration.id) ?? entry.key,
    routeId: routeBase ? routeIdByPath.get(routeBase) : undefined,
    title: readString(declaration.label) ?? readString(declaration.title) ?? entry.key,
    guards: toGuards(entry.pluginId, declaration.requiredPermission)
  };
}

function toGuards(pluginId: string, value: unknown): readonly AdminAccessGuard[] | undefined {
  const permissionKey = readString(value);
  return permissionKey ? [{ pluginId, permissionKey }] : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function formatPluginDisplayName(pluginId: string): string {
  return pluginId
    .split(/[-_.]/g)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
