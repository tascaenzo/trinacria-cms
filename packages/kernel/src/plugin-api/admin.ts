import type {
  PluginManifestAdmin,
  PluginManifestAdminNavigation,
  PluginManifestAdminResource,
  PluginManifestAdminRoute,
  PluginManifestAdminSettingsSection,
  PluginManifestAdminWidget
} from "../contracts/plugin-manifest.js";
import { omitEmptyArray } from "./naming.js";

export function defineAdminRoute(input: PluginManifestAdminRoute): PluginManifestAdminRoute {
  return {
    id: input.id,
    path: input.path,
    label: input.label,
    ...(input.requiredPermission !== undefined
      ? { requiredPermission: input.requiredPermission }
      : {}),
    ...(input.componentRef !== undefined ? { componentRef: input.componentRef } : {}),
    ...(input.order !== undefined ? { order: input.order } : {})
  };
}

export function defineAdminNavigation(
  input: PluginManifestAdminNavigation
): PluginManifestAdminNavigation {
  return {
    id: input.id,
    label: input.label,
    ...(input.path !== undefined ? { path: input.path } : {}),
    ...(input.group !== undefined ? { group: input.group } : {}),
    ...(input.requiredPermission !== undefined
      ? { requiredPermission: input.requiredPermission }
      : {}),
    ...(input.order !== undefined ? { order: input.order } : {})
  };
}

export function defineAdminResource(
  input: PluginManifestAdminResource
): PluginManifestAdminResource {
  return {
    id: input.id,
    label: input.label,
    routeBase: input.routeBase,
    apiBase: input.apiBase,
    ...(input.requiredPermission !== undefined
      ? { requiredPermission: input.requiredPermission }
      : {})
  };
}

export function defineAdminWidget(input: PluginManifestAdminWidget): PluginManifestAdminWidget {
  return {
    id: input.id,
    label: input.label,
    ...(input.requiredPermission !== undefined
      ? { requiredPermission: input.requiredPermission }
      : {}),
    ...(input.componentRef !== undefined ? { componentRef: input.componentRef } : {}),
    ...(input.layout !== undefined ? { layout: { ...input.layout } } : {})
  };
}

export function defineAdminSettingsSection(
  input: PluginManifestAdminSettingsSection
): PluginManifestAdminSettingsSection {
  return {
    id: input.id,
    label: input.label,
    ...(input.namespace !== undefined ? { namespace: input.namespace } : {}),
    ...(input.requiredPermission !== undefined
      ? { requiredPermission: input.requiredPermission }
      : {}),
    ...(input.kind !== undefined ? { kind: input.kind } : {}),
    ...(input.componentRef !== undefined ? { componentRef: input.componentRef } : {}),
    ...(input.summary !== undefined ? { summary: input.summary } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.settingKeys !== undefined ? { settingKeys: [...input.settingKeys] } : {}),
    ...(input.data !== undefined ? { data: input.data } : {}),
    ...(input.actions !== undefined ? { actions: [...input.actions] } : {}),
    ...(input.order !== undefined ? { order: input.order } : {})
  };
}

export function defineAdmin(input: PluginManifestAdmin): PluginManifestAdmin {
  const routes = omitEmptyArray(input.routes);
  const navigation = omitEmptyArray(input.navigation);
  const resources = omitEmptyArray(input.resources);
  const widgets = omitEmptyArray(input.widgets);
  const settingsSections = omitEmptyArray(input.settingsSections);

  return {
    ...(routes !== undefined ? { routes } : {}),
    ...(navigation !== undefined ? { navigation } : {}),
    ...(resources !== undefined ? { resources } : {}),
    ...(widgets !== undefined ? { widgets } : {}),
    ...(settingsSections !== undefined ? { settingsSections } : {})
  };
}
