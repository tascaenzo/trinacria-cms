/**
 * A capability or permission guard controls whether a route, navigation item,
 * or widget should be visible in the current runtime context.
 */
export interface AdminAccessGuard {
  pluginId?: string;
  capability?: string;
  permissionKey?: string;
}

/**
 * Route metadata is intentionally framework-agnostic. It describes an admin
 * feature surface without forcing React-specific rendering concerns.
 */
export interface AdminRouteDefinition {
  id: string;
  path: string;
  pluginId: string;
  title: string;
  summary?: string;
  order?: number;
  guards?: readonly AdminAccessGuard[];
}

/**
 * Navigation items point to a route and carry presentational hints used by the
 * shell to group and order links.
 */
export interface AdminNavigationItem {
  id: string;
  routeId: string;
  title: string;
  icon?: string;
  group?: string;
  badge?: string;
  order?: number;
  guards?: readonly AdminAccessGuard[];
}

/**
 * Dashboard widgets are plugin-contributed summaries that can be mounted in a
 * shared overview screen.
 */
export interface AdminDashboardWidgetDefinition {
  id: string;
  pluginId: string;
  title: string;
  summary?: string;
  order?: number;
  guards?: readonly AdminAccessGuard[];
}

/**
 * Settings sections allow plugins to project their configuration pages into a
 * shared settings area while remaining logically isolated.
 */
export interface AdminSettingsSectionDefinition {
  id: string;
  pluginId: string;
  title: string;
  summary?: string;
  order?: number;
  guards?: readonly AdminAccessGuard[];
}

/**
 * A plugin contribution is the frontend equivalent of a backend manifest: it
 * declares which routes, navigation entries, and widgets a plugin adds to the
 * admin surface.
 */
export interface AdminPluginContribution {
  pluginId: string;
  displayName: string;
  routes: readonly AdminRouteDefinition[];
  navigation: readonly AdminNavigationItem[];
  widgets?: readonly AdminDashboardWidgetDefinition[];
  settings?: readonly AdminSettingsSectionDefinition[];
}

/**
 * Runtime plugin state is intentionally small so the admin shell can be driven
 * by discovery data without importing backend-only response shapes.
 */
export interface AdminRuntimePluginInfo {
  pluginId: string;
  installed: boolean;
  version?: string;
  state?: string;
  capabilities: readonly string[];
}

/**
 * The registry result is the flattened, shell-ready view produced after merging
 * static admin contributions with runtime discovery information.
 */
export interface AdminRegistrySnapshot {
  routes: readonly AdminRouteDefinition[];
  navigation: readonly AdminNavigationItem[];
  widgets: readonly AdminDashboardWidgetDefinition[];
  settings: readonly AdminSettingsSectionDefinition[];
}
