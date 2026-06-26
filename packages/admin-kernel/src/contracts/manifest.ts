import type { AdminDashboardWidgetDefinition } from "./widget.js";
import type { AdminNavigationItem } from "./navigation.js";
import type { AdminResourceDefinition } from "./resource.js";
import type { AdminRouteDefinition } from "./page.js";
import type { AdminSettingsSectionDefinition } from "./settings.js";

/**
 * A plugin contribution is the frontend equivalent of a backend manifest: it
 * declares which routes, navigation entries, and widgets a plugin adds.
 */
export interface AdminPluginContribution {
  pluginId: string;
  displayName: string;
  displayNameKey?: string;
  routes: readonly AdminRouteDefinition[];
  navigation: readonly AdminNavigationItem[];
  resources?: readonly AdminResourceDefinition[];
  widgets?: readonly AdminDashboardWidgetDefinition[];
  settings?: readonly AdminSettingsSectionDefinition[];
}

/** Structured contribution manifest intended for plugin authors. */
export interface AdminExtensionManifest {
  pluginId: string;
  displayName: string;
  displayNameKey?: string;
  admin?: {
    pages?: readonly AdminRouteDefinition[];
    navigation?: readonly AdminNavigationItem[];
    dashboard?: {
      widgets?: readonly AdminDashboardWidgetDefinition[];
    };
    settings?: {
      sections?: readonly AdminSettingsSectionDefinition[];
    };
    resources?: readonly AdminResourceDefinition[];
  };
  i18n?: readonly unknown[];
}

export type SafeAdminExtensionManifest = AdminExtensionManifest & {
  readonly __safeAdminExtensionManifestBrand: unique symbol;
};
