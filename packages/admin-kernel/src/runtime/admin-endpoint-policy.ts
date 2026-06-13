import type {
  AdminActionDefinition,
  AdminEndpointBinding,
  AdminExtensionManifest,
  AdminJsonDataBinding,
  AdminResourceDefinition,
  AdminRouteDefinition,
  AdminSettingsSectionDefinition,
  AdminDashboardWidgetDefinition
} from "../contracts.js";

const DEFAULT_ALLOWED_PREFIXES = ["/admin"] as const;
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ALL_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export type AdminEndpointSurface = "data" | "action";

export interface AdminEndpointPolicyOptions {
  allowedPathPrefixes?: readonly string[];
  requireActionGuards?: boolean;
}

export interface AdminEndpointPolicyResult {
  ok: boolean;
  reason?: string;
}

export function validateAdminEndpointBinding(
  endpoint: AdminEndpointBinding | undefined,
  surface: AdminEndpointSurface,
  options: AdminEndpointPolicyOptions = {}
): AdminEndpointPolicyResult {
  if (!endpoint) {
    return { ok: true };
  }

  const method = normalizeMethod(endpoint.method ?? "GET");
  if (!ALL_METHODS.has(method)) {
    return { ok: false, reason: `Unsupported endpoint method: ${method}` };
  }

  if (surface === "data" && method !== "GET") {
    return { ok: false, reason: "Declarative data bindings only support GET endpoints" };
  }

  if (surface === "action" && method === "GET") {
    return { ok: false, reason: "Declarative actions must use a mutation method" };
  }

  const pathResult = validateAdminEndpointPath(endpoint.path, options);
  if (!pathResult.ok) {
    return pathResult;
  }

  return { ok: true };
}

export function validateAdminActionDefinition(
  action: AdminActionDefinition,
  ownerPluginId: string,
  options: AdminEndpointPolicyOptions = {}
): AdminEndpointPolicyResult {
  const endpointResult = validateAdminEndpointBinding(action.endpoint, "action", options);
  if (!endpointResult.ok) {
    return endpointResult;
  }

  const requireActionGuards = options.requireActionGuards ?? true;
  if (requireActionGuards && (action.guards?.length ?? 0) === 0) {
    return {
      ok: false,
      reason: `Declarative action ${ownerPluginId}:${action.id} is missing explicit guards`
    };
  }

  return { ok: true };
}

export function sanitizeAdminExtensionManifest(
  manifest: AdminExtensionManifest,
  options: AdminEndpointPolicyOptions = {}
): AdminExtensionManifest {
  return {
    ...manifest,
    admin: manifest.admin
      ? {
          ...manifest.admin,
          pages: manifest.admin.pages?.map((page) => sanitizeRoute(page, options)),
          dashboard: manifest.admin.dashboard
            ? {
                ...manifest.admin.dashboard,
                widgets: manifest.admin.dashboard.widgets?.map((widget) =>
                  sanitizeWidget(widget, options)
                )
              }
            : undefined,
          settings: manifest.admin.settings
            ? {
                ...manifest.admin.settings,
                sections: manifest.admin.settings.sections?.map((section) =>
                  sanitizeSettingsSection(section, options)
                )
              }
            : undefined,
          resources: manifest.admin.resources?.map((resource) =>
            sanitizeResource(resource, options)
          )
        }
      : undefined
  };
}

function sanitizeRoute(
  route: AdminRouteDefinition,
  options: AdminEndpointPolicyOptions
): AdminRouteDefinition {
  return {
    ...route,
    data: sanitizeDataBinding(route.data, options)
  };
}

function sanitizeWidget(
  widget: AdminDashboardWidgetDefinition,
  options: AdminEndpointPolicyOptions
): AdminDashboardWidgetDefinition {
  return {
    ...widget,
    data: sanitizeDataBinding(widget.data, options)
  };
}

function sanitizeSettingsSection(
  section: AdminSettingsSectionDefinition,
  options: AdminEndpointPolicyOptions
): AdminSettingsSectionDefinition {
  return {
    ...section,
    data: sanitizeDataBinding(section.data, options),
    actions: sanitizeActions(section.actions, section.pluginId, options)
  };
}

function sanitizeResource(
  resource: AdminResourceDefinition,
  options: AdminEndpointPolicyOptions
): AdminResourceDefinition {
  return {
    ...resource,
    actions: sanitizeActions(resource.actions, resource.pluginId, options)
  };
}

function sanitizeDataBinding(
  binding: AdminJsonDataBinding | undefined,
  options: AdminEndpointPolicyOptions
): AdminJsonDataBinding | undefined {
  if (!binding?.endpoint) {
    return binding;
  }

  const result = validateAdminEndpointBinding(binding.endpoint, "data", options);
  if (result.ok) {
    return binding;
  }

  return {
    ...binding,
    endpoint: undefined
  };
}

function sanitizeActions(
  actions: readonly AdminActionDefinition[] | undefined,
  ownerPluginId: string,
  options: AdminEndpointPolicyOptions
): readonly AdminActionDefinition[] | undefined {
  return actions?.filter(
    (action) => validateAdminActionDefinition(action, ownerPluginId, options).ok
  );
}

function validateAdminEndpointPath(
  path: string,
  options: AdminEndpointPolicyOptions
): AdminEndpointPolicyResult {
  const trimmedPath = path.trim();
  const allowedPathPrefixes = options.allowedPathPrefixes ?? DEFAULT_ALLOWED_PREFIXES;

  if (!trimmedPath) {
    return { ok: false, reason: "Endpoint path is empty" };
  }
  if (trimmedPath !== path) {
    return { ok: false, reason: "Endpoint path contains leading or trailing whitespace" };
  }
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmedPath) || trimmedPath.startsWith("//")) {
    return { ok: false, reason: "Endpoint path must be relative to the admin API origin" };
  }
  if (!trimmedPath.startsWith("/")) {
    return { ok: false, reason: "Endpoint path must start with /" };
  }
  if (trimmedPath.includes("\\") || /[\u0000-\u001f\u007f]/.test(trimmedPath)) {
    return { ok: false, reason: "Endpoint path contains unsafe characters" };
  }
  if (trimmedPath.includes("..") || /%2e/i.test(trimmedPath) || /%2f/i.test(trimmedPath)) {
    return { ok: false, reason: "Endpoint path contains unsafe traversal or encoded slash" };
  }
  if (!allowedPathPrefixes.some((prefix) => matchesPrefix(trimmedPath, prefix))) {
    return {
      ok: false,
      reason: `Endpoint path is outside allowed admin namespaces: ${allowedPathPrefixes.join(", ")}`
    };
  }

  return { ok: true };
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function normalizeMethod(method: string): string {
  return method.trim().toUpperCase();
}

export function isMutationMethod(method: string | undefined): boolean {
  return MUTATION_METHODS.has(normalizeMethod(method ?? "POST"));
}
