import type {
  AdminNavigationItem,
  AdminPluginContribution,
  AdminRegistrySnapshot,
  AdminRouteDefinition,
  AdminRuntimePluginInfo
} from "../contracts.js";
import type { ReactNode } from "react";
import type { Locale, TranslateFn } from "../lib/i18n.js";

/**
 * Page render context carries the minimum runtime state every screen needs in
 * order to render capability-aware admin content.
 */
export interface AdminPageRenderContext {
  route: AdminRouteDefinition;
  runtimePlugins: readonly AdminRuntimePluginInfo[];
  capabilityIndex: ReadonlyMap<string, Set<string>>;
  locale: Locale;
  t: TranslateFn;
}

/**
 * Renderable routes extend the framework-agnostic contract with the concrete
 * React rendering function used by the backoffice application.
 */
export interface RenderableAdminRoute extends AdminRouteDefinition {
  render: (context: AdminPageRenderContext) => ReactNode;
}

/**
 * Renderable contributions are what the React backoffice mounts after the base
 * contract has been adapted to a real UI framework.
 */
export interface RenderableAdminContribution extends Omit<AdminPluginContribution, "routes"> {
  routes: readonly RenderableAdminRoute[];
}

export interface RenderableAdminRegistrySnapshot extends AdminRegistrySnapshot {
  routes: readonly RenderableAdminRoute[];
}

function isRouteVisible(
  route: AdminRouteDefinition,
  runtimePlugins: readonly AdminRuntimePluginInfo[],
  capabilityIndex: ReadonlyMap<string, Set<string>>
): boolean {
  const plugin = runtimePlugins.find((entry) => entry.pluginId === route.pluginId);
  if (!plugin?.installed || plugin.state === "disabled" || plugin.state === "failed") {
    return false;
  }

  for (const guard of route.guards ?? []) {
    if (guard.pluginId) {
      const guardPlugin = runtimePlugins.find((entry) => entry.pluginId === guard.pluginId);
      if (!guardPlugin?.installed || guardPlugin.state !== "loaded") {
        return false;
      }
    }
    if (guard.capability) {
      const pluginId = guard.pluginId ?? route.pluginId;
      const capabilities = capabilityIndex.get(pluginId);
      if (!capabilities?.has(guard.capability)) {
        return false;
      }
    }
  }

  return true;
}

function isNavigationVisible(
  item: AdminNavigationItem,
  routeIds: ReadonlySet<string>,
  runtimePlugins: readonly AdminRuntimePluginInfo[],
  capabilityIndex: ReadonlyMap<string, Set<string>>
): boolean {
  if (!routeIds.has(item.routeId)) {
    return false;
  }

  for (const guard of item.guards ?? []) {
    if (guard.pluginId) {
      const plugin = runtimePlugins.find((entry) => entry.pluginId === guard.pluginId);
      if (!plugin?.installed || plugin.state !== "loaded") {
        return false;
      }
    }
    if (guard.capability) {
      const pluginId = guard.pluginId;
      if (!pluginId) {
        return false;
      }
      const capabilities = capabilityIndex.get(pluginId);
      if (!capabilities?.has(guard.capability)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * The registry builder merges static admin contributions with runtime discovery
 * so the shell only exposes routes that make sense for the current CMS instance.
 */
export function buildAdminRegistry(
  contributions: readonly RenderableAdminContribution[],
  runtimePlugins: readonly AdminRuntimePluginInfo[],
  t: TranslateFn
): RenderableAdminRegistrySnapshot {
  const capabilityIndex = new Map<string, Set<string>>();
  for (const plugin of runtimePlugins) {
    capabilityIndex.set(plugin.pluginId, new Set(plugin.capabilities));
  }

  const routes = contributions
    .flatMap((contribution) => contribution.routes)
    .filter((route) => isRouteVisible(route, runtimePlugins, capabilityIndex))
    .map((route) => ({
      ...route,
      title: route.titleKey ? t(route.titleKey, route.title) : route.title,
      summary: route.summaryKey ? t(route.summaryKey, route.summary) : route.summary
    }))
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));

  const routeIds = new Set(routes.map((route) => route.id));

  const navigation = contributions
    .flatMap((contribution) => contribution.navigation)
    .filter((item) => isNavigationVisible(item, routeIds, runtimePlugins, capabilityIndex))
    .map((item) => ({
      ...item,
      title: item.titleKey ? t(item.titleKey, item.title) : item.title,
      group: item.groupKey ? t(item.groupKey, item.group) : item.group
    }))
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));

  return {
    routes,
    navigation,
    widgets: contributions
      .flatMap((contribution) => contribution.widgets ?? [])
      .map((widget) => ({
        ...widget,
        title: widget.titleKey ? t(widget.titleKey, widget.title) : widget.title,
        summary: widget.summaryKey ? t(widget.summaryKey, widget.summary) : widget.summary
      }))
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
    settings: contributions
      .flatMap((contribution) => contribution.settings ?? [])
      .map((section) => ({
        ...section,
        title: section.titleKey ? t(section.titleKey, section.title) : section.title,
        summary: section.summaryKey ? t(section.summaryKey, section.summary) : section.summary
      }))
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
  };
}
