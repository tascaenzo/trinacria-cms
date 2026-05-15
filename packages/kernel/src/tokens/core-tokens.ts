import { createToken } from "@trinacria/core";
import type { AuthzService } from "../contracts/authz-service.js";
import type { DbAdapter } from "../contracts/db-adapter.js";
import type { KernelAdminRouteGuard } from "../contracts/kernel-admin-route-guard.js";
import type { PluginRuntime } from "../contracts/plugin-runtime.js";
import type { PluginRuntimeStore } from "../contracts/plugin-runtime-store.js";
import type { PluginSecurityProvisioner } from "../contracts/plugin-security-provisioner.js";
import type { KernelSystemService } from "../runtime/kernel-system-service.js";
import type { KernelHealthService } from "../runtime/kernel-health-service.js";
import type { EntityRegistry } from "../runtime/entity-registry.js";

/**
 * Core DI tokens exposed as stable integration points for platform services.
 */
export const CORE_TOKENS = {
  PLUGIN_RUNTIME: createToken<PluginRuntime>("CMS_CORE_PLUGIN_RUNTIME"),
  PLUGIN_RUNTIME_STORE: createToken<PluginRuntimeStore>("CMS_CORE_PLUGIN_RUNTIME_STORE"),
  DB_ADAPTER: createToken<DbAdapter>("CMS_CORE_DB_ADAPTER"),
  ENTITY_REGISTRY: createToken<EntityRegistry>("CMS_CORE_ENTITY_REGISTRY"),
  AUTHZ_SERVICE: createToken<AuthzService>("CMS_CORE_AUTHZ_SERVICE"),
  PLUGIN_SECURITY_PROVISIONER: createToken<PluginSecurityProvisioner>(
    "CMS_CORE_PLUGIN_SECURITY_PROVISIONER"
  ),
  KERNEL_HEALTH_SERVICE: createToken<KernelHealthService>("CMS_KERNEL_HEALTH_SERVICE"),
  KERNEL_SYSTEM_SERVICE: createToken<KernelSystemService>("CMS_KERNEL_SYSTEM_SERVICE"),
  KERNEL_ADMIN_ROUTE_GUARD: createToken<KernelAdminRouteGuard>("CMS_KERNEL_ADMIN_ROUTE_GUARD"),
  LOGGER: createToken<{
    info(message: string, metadata?: Record<string, unknown>): void;
    warn(message: string, metadata?: Record<string, unknown>): void;
    error(message: string, metadata?: Record<string, unknown>): void;
  }>("CMS_CORE_LOGGER")
} as const;
