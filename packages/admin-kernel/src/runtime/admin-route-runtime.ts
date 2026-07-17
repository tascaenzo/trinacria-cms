import type {
  AdminActionDefinition,
  AdminAccessGuard,
  AdminDashboardWidgetDefinition,
  AdminNavigationItem,
  AdminPluginContribution,
  AdminRegistrySnapshot,
  AdminResourceDefinition,
  AdminRouteDefinition,
  AdminRuntimePluginInfo,
  AdminSettingsSectionDefinition
} from "../contracts.js";
import type { ReactNode } from "react";
import type { Locale, TranslateFn } from "../lib/i18n.js";
import {
  type AdminRendererRegistryInput,
  resolveAdminPageRenderer,
  resolveAdminDashboardWidgetRenderer,
  resolveAdminSettingsSectionRenderer
} from "./admin-renderers.js";

/**
 * Page render context carries the minimum runtime state every screen needs in
 * order to render capability-aware admin content.
 */
export interface AdminPageRenderContext {
  route: AdminRouteDefinition;
  routes: readonly AdminRouteDefinition[];
  runtimePlugins: readonly AdminRuntimePluginInfo[];
  capabilityIndex: ReadonlyMap<string, Set<string>>;
  resources: readonly AdminResourceDefinition[];
  settings: readonly RenderableAdminSettingsSection[];
  widgets: readonly RenderableAdminDashboardWidget[];
  locale: Locale;
  /** Whether the authenticated operator may enter dashboard layout editing mode. */
  canCustomizeDashboard?: boolean;
  /** Route navigation supplied by the shell for widget-level quick actions. */
  navigateToRoute?: (routeId: string, params?: URLSearchParams) => void;
  /** Base path used by direct browser uploads and other binary endpoints. */
  apiBaseUrl?: string;
  cms: typeof import("./cms-sdk.js").cms;
  t: TranslateFn;
}

/**
 * Renderable routes extend the framework-agnostic contract with the concrete
 * React rendering function used by the backoffice application.
 */
export interface RenderableAdminRoute extends AdminRouteDefinition {
  render: (context: AdminPageRenderContext) => ReactNode;
}

export interface AdminDashboardWidgetRenderContext extends Omit<AdminPageRenderContext, "route"> {
  widget: RenderableAdminDashboardWidget;
}

export interface AdminSettingsSectionRenderContext extends Omit<AdminPageRenderContext, "route"> {
  section: RenderableAdminSettingsSection;
}

export interface RenderableAdminDashboardWidget extends AdminDashboardWidgetDefinition {
  render?: (context: AdminDashboardWidgetRenderContext) => ReactNode;
}

export interface RenderableAdminSettingsSection extends AdminSettingsSectionDefinition {
  render?: (context: AdminSettingsSectionRenderContext) => ReactNode;
}

/**
 * Renderable contributions are what the React backoffice mounts after the base
 * contract has been adapted to a real UI framework.
 */
export interface RenderableAdminContribution extends Omit<
  AdminPluginContribution,
  "routes" | "widgets" | "settings"
> {
  routes: readonly RenderableAdminRoute[];
  widgets?: readonly RenderableAdminDashboardWidget[];
  settings?: readonly RenderableAdminSettingsSection[];
}

export interface RenderableAdminRegistrySnapshot extends Omit<
  AdminRegistrySnapshot,
  "routes" | "widgets" | "settings"
> {
  routes: readonly RenderableAdminRoute[];
  widgets: readonly RenderableAdminDashboardWidget[];
  settings: readonly RenderableAdminSettingsSection[];
}

function isPluginLoaded(
  pluginId: string,
  runtimePlugins: readonly AdminRuntimePluginInfo[]
): boolean {
  if (pluginId === "kernel") {
    return true;
  }

  const plugin = runtimePlugins.find((entry) => entry.pluginId === pluginId);
  return Boolean(plugin?.installed && plugin.state === "loaded");
}

function areGuardsSatisfied(input: {
  guards?: readonly AdminAccessGuard[];
  ownerPluginId?: string;
  runtimePlugins: readonly AdminRuntimePluginInfo[];
  capabilityIndex: ReadonlyMap<string, Set<string>>;
  permissionIndex: ReadonlySet<string>;
}): boolean {
  for (const guard of input.guards ?? []) {
    const guardPluginId = guard.pluginId ?? input.ownerPluginId;

    if (guard.pluginId && !isPluginLoaded(guard.pluginId, input.runtimePlugins)) {
      return false;
    }
    if (guard.capability) {
      if (!guardPluginId) {
        return false;
      }
      const capabilities = input.capabilityIndex.get(guardPluginId);
      if (!capabilities?.has(guard.capability)) {
        return false;
      }
    }
    if (guard.permissionKey && !isPermissionGranted(guard.permissionKey, input.permissionIndex)) {
      return false;
    }
  }

  return true;
}

function isPermissionGranted(
  requiredPermissionKey: string,
  permissionIndex: ReadonlySet<string>
): boolean {
  for (const grantedPermissionKey of permissionIndex) {
    if (matchesPermissionPattern(grantedPermissionKey, requiredPermissionKey)) {
      return true;
    }
  }

  return false;
}

function matchesPermissionPattern(grantedPermissionKey: string, requiredPermissionKey: string) {
  const granted = grantedPermissionKey.trim().toLowerCase();
  const required = requiredPermissionKey.trim().toLowerCase();
  if (!granted || !required) {
    return false;
  }
  if (granted === "*" || granted === required) {
    return true;
  }

  const grantedParts = granted.split(":");
  const requiredParts = required.split(":");
  if (grantedParts.length !== requiredParts.length) {
    return false;
  }

  return grantedParts.every((part, index) => part === "*" || part === requiredParts[index]);
}

function isRouteVisible(
  route: AdminRouteDefinition,
  runtimePlugins: readonly AdminRuntimePluginInfo[],
  capabilityIndex: ReadonlyMap<string, Set<string>>,
  permissionIndex: ReadonlySet<string>
): boolean {
  if (!isPluginLoaded(route.pluginId, runtimePlugins)) {
    return false;
  }

  return areGuardsSatisfied({
    guards: route.guards,
    ownerPluginId: route.pluginId,
    runtimePlugins,
    capabilityIndex,
    permissionIndex
  });
}

function isNavigationVisible(
  item: AdminNavigationItem,
  routeIds: ReadonlySet<string>,
  runtimePlugins: readonly AdminRuntimePluginInfo[],
  capabilityIndex: ReadonlyMap<string, Set<string>>,
  permissionIndex: ReadonlySet<string>
): boolean {
  if (!routeIds.has(item.routeId)) {
    return false;
  }

  return areGuardsSatisfied({
    guards: item.guards,
    runtimePlugins,
    capabilityIndex,
    permissionIndex
  });
}

function isResourceVisible(
  resource: AdminResourceDefinition,
  routeIds: ReadonlySet<string>,
  runtimePlugins: readonly AdminRuntimePluginInfo[],
  capabilityIndex: ReadonlyMap<string, Set<string>>,
  permissionIndex: ReadonlySet<string>
): boolean {
  if (!isPluginLoaded(resource.pluginId, runtimePlugins)) {
    return false;
  }

  if (resource.routeId && !routeIds.has(resource.routeId)) {
    return false;
  }

  if (
    !areGuardsSatisfied({
      guards: resource.guards,
      ownerPluginId: resource.pluginId,
      runtimePlugins,
      capabilityIndex,
      permissionIndex
    })
  ) {
    return false;
  }

  const listCapability = resource.capabilities?.list ?? resource.capabilities?.read;
  if (listCapability) {
    const capabilities = capabilityIndex.get(resource.pluginId);
    if (!capabilities?.has(listCapability)) {
      return false;
    }
  }

  return true;
}

function isContributionSurfaceVisible(
  surface: AdminDashboardWidgetDefinition | AdminSettingsSectionDefinition,
  runtimePlugins: readonly AdminRuntimePluginInfo[],
  capabilityIndex: ReadonlyMap<string, Set<string>>,
  permissionIndex: ReadonlySet<string>
): boolean {
  if (!isPluginLoaded(surface.pluginId, runtimePlugins)) {
    return false;
  }

  return areGuardsSatisfied({
    guards: surface.guards,
    ownerPluginId: surface.pluginId,
    runtimePlugins,
    capabilityIndex,
    permissionIndex
  });
}

function isActionVisible(
  action: AdminActionDefinition,
  ownerPluginId: string,
  runtimePlugins: readonly AdminRuntimePluginInfo[],
  capabilityIndex: ReadonlyMap<string, Set<string>>,
  permissionIndex: ReadonlySet<string>
): boolean {
  const pluginId = action.pluginId ?? ownerPluginId;
  if (!isPluginLoaded(pluginId, runtimePlugins)) {
    return false;
  }

  return areGuardsSatisfied({
    guards: action.guards,
    ownerPluginId: pluginId,
    runtimePlugins,
    capabilityIndex,
    permissionIndex
  });
}

function translateActions(
  actions: readonly AdminActionDefinition[] | undefined,
  ownerPluginId: string,
  runtimePlugins: readonly AdminRuntimePluginInfo[],
  capabilityIndex: ReadonlyMap<string, Set<string>>,
  permissionIndex: ReadonlySet<string>,
  t: TranslateFn
): readonly AdminActionDefinition[] | undefined {
  return actions
    ?.filter((action) =>
      isActionVisible(action, ownerPluginId, runtimePlugins, capabilityIndex, permissionIndex)
    )
    .map((action) => ({
      ...action,
      pluginId: action.pluginId ?? ownerPluginId,
      title: action.titleKey ? t(action.titleKey, action.title) : action.title
    }))
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}

/**
 * The registry builder merges static admin contributions with runtime discovery
 * so the shell only exposes routes that make sense for the current CMS instance.
 */
export function buildAdminRegistry(
  contributions: readonly RenderableAdminContribution[],
  runtimePlugins: readonly AdminRuntimePluginInfo[],
  t: TranslateFn,
  userPermissionKeys: readonly string[] = [],
  renderers?: AdminRendererRegistryInput
): RenderableAdminRegistrySnapshot {
  const capabilityIndex = new Map<string, Set<string>>();
  for (const plugin of runtimePlugins) {
    capabilityIndex.set(plugin.pluginId, new Set(plugin.capabilities));
  }
  const permissionIndex = new Set(userPermissionKeys);

  const routes = contributions
    .flatMap((contribution) => contribution.routes)
    .filter((route) => isRouteVisible(route, runtimePlugins, capabilityIndex, permissionIndex))
    .map((route) => ({
      ...route,
      title: route.titleKey ? t(route.titleKey, route.title) : route.title,
      summary: route.summaryKey ? t(route.summaryKey, route.summary) : route.summary,
      render: resolveAdminPageRenderer(route.componentRef, renderers) ?? route.render
    }));
  const uniqueRoutes = dedupeByLast(routes, (route) => route.id).sort(
    (left, right) => (left.order ?? 0) - (right.order ?? 0)
  );

  const routeIds = new Set(uniqueRoutes.map((route) => route.id));

  const resources = contributions
    .flatMap((contribution) => contribution.resources ?? [])
    .filter((resource) =>
      isResourceVisible(resource, routeIds, runtimePlugins, capabilityIndex, permissionIndex)
    )
    .map((resource) => ({
      ...resource,
      title: resource.titleKey ? t(resource.titleKey, resource.title) : resource.title,
      summary: resource.summaryKey ? t(resource.summaryKey, resource.summary) : resource.summary,
      fields: resource.fields?.map((field) => ({
        ...field,
        label: field.labelKey ? t(field.labelKey, field.label) : field.label
      })),
      detail:
        resource.detail && typeof resource.detail === "object"
          ? {
              ...resource.detail,
              title: resource.detail.titleKey
                ? t(resource.detail.titleKey, resource.detail.title)
                : resource.detail.title,
              sections: resource.detail.sections?.map((section) => ({
                ...section,
                title: section.titleKey ? t(section.titleKey, section.title) : section.title
              }))
            }
          : resource.detail,
      actions: translateActions(
        resource.actions,
        resource.pluginId,
        runtimePlugins,
        capabilityIndex,
        permissionIndex,
        t
      )
    }));
  const uniqueResources = dedupeByLast(resources, (resource) => resource.id).sort(
    (left, right) => (left.order ?? 0) - (right.order ?? 0)
  );

  const navigation = contributions
    .flatMap((contribution) => contribution.navigation)
    .filter((item) =>
      isNavigationVisible(item, routeIds, runtimePlugins, capabilityIndex, permissionIndex)
    )
    .map((item) => ({
      ...item,
      title: item.titleKey ? t(item.titleKey, item.title) : item.title,
      group: item.groupKey ? t(item.groupKey, item.group) : item.group
    }));
  const uniqueNavigation = dedupeByLast(navigation, (item) => item.id).sort(
    (left, right) => (left.order ?? 0) - (right.order ?? 0)
  );

  return {
    routes: uniqueRoutes,
    navigation: uniqueNavigation,
    resources: uniqueResources,
    widgets: dedupeByLast(
      contributions
        .flatMap((contribution) => contribution.widgets ?? [])
        .filter((widget) =>
          isContributionSurfaceVisible(widget, runtimePlugins, capabilityIndex, permissionIndex)
        )
        .map((widget) => ({
          ...widget,
          title: widget.titleKey ? t(widget.titleKey, widget.title) : widget.title,
          summary: widget.summaryKey ? t(widget.summaryKey, widget.summary) : widget.summary,
          render:
            widget.render ?? resolveAdminDashboardWidgetRenderer(widget.componentRef, renderers)
        })),
      (widget) => `${widget.pluginId}:${widget.id}`
    ).sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
    settings: dedupeByLast(
      contributions
        .flatMap((contribution) => contribution.settings ?? [])
        .filter((section) =>
          isContributionSurfaceVisible(section, runtimePlugins, capabilityIndex, permissionIndex)
        )
        .map((section) => ({
          ...section,
          title: section.titleKey ? t(section.titleKey, section.title) : section.title,
          summary: section.summaryKey ? t(section.summaryKey, section.summary) : section.summary,
          render:
            section.render ?? resolveAdminSettingsSectionRenderer(section.componentRef, renderers),
          actions: translateActions(
            section.actions,
            section.pluginId,
            runtimePlugins,
            capabilityIndex,
            permissionIndex,
            t
          )
        })),
      (section) => `${section.pluginId}:${section.id}`
    ).sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
  };
}

function dedupeByLast<T>(items: readonly T[], keyOf: (item: T) => string): T[] {
  const index = new Map<string, T>();
  for (const item of items) {
    index.set(keyOf(item), item);
  }
  return Array.from(index.values());
}
