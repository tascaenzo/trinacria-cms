import type { AdminDashboardWidgetDefinition } from "./widget.js";
import type { AdminNavigationItem } from "./navigation.js";
import type { AdminResourceDefinition } from "./resource.js";
import type { AdminRouteDefinition } from "./page.js";
import type { AdminSettingsSectionDefinition } from "./settings.js";

/** Runtime plugin state used by the admin shell. */
export interface AdminRuntimePluginInfo {
  pluginId: string;
  installed: boolean;
  version?: string;
  state?: string;
  capabilities: readonly string[];
}

/** Flattened, shell-ready view after merging contributions and runtime state. */
export interface AdminRegistrySnapshot {
  routes: readonly AdminRouteDefinition[];
  navigation: readonly AdminNavigationItem[];
  resources: readonly AdminResourceDefinition[];
  widgets: readonly AdminDashboardWidgetDefinition[];
  settings: readonly AdminSettingsSectionDefinition[];
}
