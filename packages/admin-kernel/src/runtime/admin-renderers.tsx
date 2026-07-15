import { PluginPermissionCenterSection } from "../pages/settings/components/plugin-permission-center.js";
import { PluginManagementSettingsSection } from "../pages/settings/components/plugin-management-settings-section.js";
import { BackofficeThemeSettingsSection } from "../pages/settings/components/backoffice-theme-settings-section.js";
import type {
  AdminDashboardWidgetRenderContext,
  AdminSettingsSectionRenderContext
} from "./admin-route-runtime.js";
import type { ReactNode } from "react";

export type AdminSettingsSectionRenderer = (
  context: AdminSettingsSectionRenderContext
) => ReactNode;

export type AdminDashboardWidgetRenderer = (
  context: AdminDashboardWidgetRenderContext
) => ReactNode;

export interface AdminRendererRegistryInput {
  dashboardWidgets?: ReadonlyMap<string, AdminDashboardWidgetRenderer>;
  settingsSections?: ReadonlyMap<string, AdminSettingsSectionRenderer>;
}

const settingsSectionRenderers = new Map<string, AdminSettingsSectionRenderer>([
  [
    "core-pack:plugin-permission-center",
    (context) => <PluginPermissionCenterSection {...context} />
  ],
  ["core-pack:plugin-management", (context) => <PluginManagementSettingsSection {...context} />],
  ["core-pack:backoffice-theme", (context) => <BackofficeThemeSettingsSection {...context} />]
]);

const dashboardWidgetRenderers = new Map<string, AdminDashboardWidgetRenderer>();

export function resolveAdminSettingsSectionRenderer(
  componentRef: string | undefined,
  renderers?: AdminRendererRegistryInput
): AdminSettingsSectionRenderer | undefined {
  if (!componentRef) return undefined;
  return (
    renderers?.settingsSections?.get(componentRef) ?? settingsSectionRenderers.get(componentRef)
  );
}

export function resolveAdminDashboardWidgetRenderer(
  componentRef: string | undefined,
  renderers?: AdminRendererRegistryInput
): AdminDashboardWidgetRenderer | undefined {
  if (!componentRef) return undefined;
  return (
    renderers?.dashboardWidgets?.get(componentRef) ?? dashboardWidgetRenderers.get(componentRef)
  );
}
