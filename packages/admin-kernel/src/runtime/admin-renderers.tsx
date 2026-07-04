import { EmailDeliveryWidget } from "../pages/dashboard-widgets/email-delivery-widget.js";
import { EmailTemplateManager } from "../pages/settings/components/email-template-manager.js";
import { PluginPermissionCenterSection } from "../pages/settings/components/plugin-permission-center.js";
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

const settingsSectionRenderers = new Map<string, AdminSettingsSectionRenderer>([
  [
    "core-pack:plugin-permission-center",
    (context) => <PluginPermissionCenterSection {...context} />
  ],
  ["email-pack:email-template-manager", ({ t }) => <EmailTemplateManager t={t} />]
]);

const dashboardWidgetRenderers = new Map<string, AdminDashboardWidgetRenderer>([
  ["email-pack:delivery-status-widget", (context) => <EmailDeliveryWidget {...context} />]
]);

export function resolveAdminSettingsSectionRenderer(
  componentRef: string | undefined
): AdminSettingsSectionRenderer | undefined {
  return componentRef ? settingsSectionRenderers.get(componentRef) : undefined;
}

export function resolveAdminDashboardWidgetRenderer(
  componentRef: string | undefined
): AdminDashboardWidgetRenderer | undefined {
  return componentRef ? dashboardWidgetRenderers.get(componentRef) : undefined;
}
