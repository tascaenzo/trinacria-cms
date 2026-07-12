import type {
  AdminAccessGuard,
  AdminActionDefinition,
  AdminExtensionManifest,
  AdminJsonDataBinding,
  AdminNavigationItem,
  AdminResourceDefinition,
  AdminRouteDefinition,
  AdminRuntimePluginInfo,
  AdminSettingsSectionKind,
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
  const [plugins, capabilities, manifests] = await Promise.all([
    cms.system.listInstalledPlugins(),
    cms.system.listInstalledCapabilities(),
    loadAdminExtensionManifests()
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
    manifests
  };
}

type ContributionCatalog = Awaited<ReturnType<typeof cms.system.listPluginContributions>>["data"];
type AdminExtensionsResponse = {
  data: readonly RuntimeAdminExtensionManifest[];
};
type RuntimeAdminExtensionManifest = {
  pluginId: string;
  displayName: string;
  admin: {
    navigation?: readonly Record<string, unknown>[];
    routes?: readonly Record<string, unknown>[];
    resources?: readonly Record<string, unknown>[];
    widgets?: readonly Record<string, unknown>[];
    settingsSections?: readonly Record<string, unknown>[];
  };
};
type ContributionSnapshot = {
  pluginId: string;
  key: string;
  declaration: Record<string, unknown>;
};

async function loadAdminExtensionManifests(): Promise<readonly AdminExtensionManifest[]> {
  try {
    const response = await cms.request<AdminExtensionsResponse>({
      method: "GET",
      path: "/v1/admin/extensions"
    });
    return response.data.map((manifest) => toAdminExtensionManifest(manifest));
  } catch {
    const contributions = await cms.system.listPluginContributions();
    return createAdminExtensionManifestsFromContributionCatalog(contributions.data);
  }
}

function toAdminExtensionManifest(manifest: RuntimeAdminExtensionManifest): AdminExtensionManifest {
  const routes = (manifest.admin.routes ?? []).map((entry) =>
    toAdminRoute({
      pluginId: manifest.pluginId,
      key: readString(entry.id) ?? readString(entry.path) ?? "route",
      declaration: entry
    })
  );
  const routeIdByPath = new Map(routes.map((route) => [route.path, route.id]));

  return {
    pluginId: manifest.pluginId,
    displayName: manifest.displayName,
    admin: {
      pages: routes,
      navigation: (manifest.admin.navigation ?? [])
        .map((entry) =>
          toAdminNavigationItem(
            {
              pluginId: manifest.pluginId,
              key: readString(entry.id) ?? readString(entry.path) ?? "navigation",
              declaration: entry
            },
            routeIdByPath
          )
        )
        .filter((entry) => entry.routeId),
      dashboard: {
        widgets: (manifest.admin.widgets ?? []).map((entry) =>
          toAdminWidget({
            pluginId: manifest.pluginId,
            key: readString(entry.id) ?? "widget",
            declaration: entry
          })
        )
      },
      settings: {
        sections: (manifest.admin.settingsSections ?? []).map((entry) =>
          toAdminSettingsSection({
            pluginId: manifest.pluginId,
            key: readString(entry.id) ?? "settings",
            declaration: entry
          })
        )
      },
      resources: (manifest.admin.resources ?? []).map((entry) =>
        toAdminResource(
          {
            pluginId: manifest.pluginId,
            key: readString(entry.id) ?? "resource",
            declaration: entry
          },
          routeIdByPath
        )
      )
    }
  };
}

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
    kind: readString(declaration.componentRef) ? "custom" : "card",
    componentRef: readString(declaration.componentRef),
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
    kind: readSettingsSectionKind(declaration.kind) ?? "panel",
    componentRef: readString(declaration.componentRef),
    title: readString(declaration.label) ?? readString(declaration.title) ?? entry.key,
    summary: readString(declaration.summary),
    category: readString(declaration.category) ?? readString(declaration.namespace),
    settingKeys: readStringArray(declaration.settingKeys),
    data: readDataBinding(declaration.data),
    actions: readActions(declaration.actions),
    order: readNumber(declaration.order),
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

function readStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value.filter(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
  );
  return strings.length > 0 ? strings.map((entry) => entry.trim()) : undefined;
}

function readSettingsSectionKind(value: unknown): AdminSettingsSectionKind | undefined {
  if (value === "form" || value === "panel" || value === "custom") {
    return value;
  }

  return undefined;
}

function readDataBinding(value: unknown): AdminJsonDataBinding | undefined {
  return isRecord(value) ? (value as AdminJsonDataBinding) : undefined;
}

function readActions(value: unknown): readonly AdminActionDefinition[] | undefined {
  return Array.isArray(value) ? (value as readonly AdminActionDefinition[]) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function formatPluginDisplayName(pluginId: string): string {
  return pluginId
    .split(/[-_.]/g)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
