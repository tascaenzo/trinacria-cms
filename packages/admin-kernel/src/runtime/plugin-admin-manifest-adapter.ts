import type { AdminAccessGuard, AdminExtensionManifest } from "../contracts.js";
import type { BackofficeModule } from "../module.js";

interface PluginAdminRouteDeclaration {
  id: string;
  path: string;
  label: string;
  requiredPermission?: string;
  componentRef?: string;
  order?: number;
}

interface PluginAdminNavigationDeclaration {
  id: string;
  label: string;
  path?: string;
  requiredPermission?: string;
  order?: number;
}

interface PluginAdminResourceDeclaration {
  id: string;
  label: string;
  routeBase: string;
  apiBase: string;
  requiredPermission?: string;
}

interface PluginAdminWidgetDeclaration {
  id: string;
  label: string;
  requiredPermission?: string;
  componentRef?: string;
}

interface PluginAdminSettingsSectionDeclaration {
  id: string;
  label: string;
  namespace: string;
  requiredPermission?: string;
}

export interface PluginAdminManifestDeclaration {
  routes?: readonly PluginAdminRouteDeclaration[];
  navigation?: readonly PluginAdminNavigationDeclaration[];
  resources?: readonly PluginAdminResourceDeclaration[];
  widgets?: readonly PluginAdminWidgetDeclaration[];
  settingsSections?: readonly PluginAdminSettingsSectionDeclaration[];
}

export interface DefinePluginBackofficeModuleInput {
  pluginId: string;
  displayName: string;
  displayNameKey?: string;
  admin: PluginAdminManifestDeclaration;
}

export function definePluginBackofficeModule(
  input: DefinePluginBackofficeModuleInput
): BackofficeModule {
  return {
    id: `${input.pluginId}.admin`,
    manifests: [createAdminExtensionManifestFromPluginAdmin(input)]
  };
}

export function createAdminExtensionManifestFromPluginAdmin(
  input: DefinePluginBackofficeModuleInput
): AdminExtensionManifest {
  const routes = (input.admin.routes ?? []).map((route) => ({
    id: route.id,
    path: route.path,
    pluginId: input.pluginId,
    mode: "declarative" as const,
    kind: "custom" as const,
    title: route.label,
    componentRef: route.componentRef,
    order: route.order,
    guards: toGuards(input.pluginId, route.requiredPermission)
  }));
  const routeIdByPath = new Map(routes.map((route) => [route.path, route.id]));

  return {
    pluginId: input.pluginId,
    displayName: input.displayName,
    displayNameKey: input.displayNameKey,
    admin: {
      pages: routes,
      navigation: (input.admin.navigation ?? []).map((item) => ({
        id: item.id,
        routeId: item.path ? (routeIdByPath.get(item.path) ?? item.id) : item.id,
        title: item.label,
        order: item.order,
        guards: toGuards(input.pluginId, item.requiredPermission)
      })),
      resources: (input.admin.resources ?? []).map((resource) => ({
        id: `${input.pluginId}.${resource.id}`,
        pluginId: input.pluginId,
        entityName: resource.id,
        routeId: routeIdByPath.get(resource.routeBase),
        title: resource.label,
        guards: toGuards(input.pluginId, resource.requiredPermission)
      })),
      dashboard: {
        widgets: (input.admin.widgets ?? []).map((widget) => ({
          id: widget.id,
          pluginId: input.pluginId,
          mode: "declarative" as const,
          kind: "card" as const,
          title: widget.label,
          guards: toGuards(input.pluginId, widget.requiredPermission)
        }))
      },
      settings: {
        sections: (input.admin.settingsSections ?? []).map((section) => ({
          id: section.id,
          pluginId: input.pluginId,
          mode: "declarative" as const,
          kind: "panel" as const,
          title: section.label,
          guards: toGuards(input.pluginId, section.requiredPermission)
        }))
      }
    }
  };
}

function toGuards(
  pluginId: string,
  requiredPermission: string | undefined
): readonly AdminAccessGuard[] | undefined {
  return requiredPermission ? [{ pluginId, permissionKey: requiredPermission }] : undefined;
}
