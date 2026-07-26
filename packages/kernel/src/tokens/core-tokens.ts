import { createToken } from "@trinacria/core";
import type { AuthzService } from "../contracts/authz-service.js";
import type { CacheAdapter } from "../contracts/cache-adapter.js";
import type { DbAdapter } from "../contracts/db-adapter.js";
import type { KernelAdminRouteGuard } from "../contracts/kernel-admin-route-guard.js";
import type { PluginEventSubscriptionAuthorizer } from "../contracts/plugin-access-policy.js";
import type { PluginDiscoveryService } from "../contracts/plugin-discovery.js";
import type { PluginManifestProvisioner } from "../contracts/plugin-manifest-provisioner.js";
import type { PluginRuntime } from "../contracts/plugin-runtime.js";
import type { PluginRuntimeStore } from "../contracts/plugin-runtime-store.js";
import type {
  SecureEventPayloadAuthorizer,
  SecureEventPayloadStore
} from "../contracts/secure-event-payloads.js";
import type { EntityRegistry } from "../runtime/persistence/entity-registry.js";
import type { KernelHealthService } from "../runtime/system/kernel-health-service.js";
import type { KernelSystemService } from "../runtime/system/kernel-system-service.js";

/**
 * Core DI tokens exposed as stable integration points for platform services.
 */
export const CORE_TOKENS = {
  PLUGIN_RUNTIME: createToken<PluginRuntime>("CMS_CORE_PLUGIN_RUNTIME"),
  PLUGIN_RUNTIME_STORE: createToken<PluginRuntimeStore>("CMS_CORE_PLUGIN_RUNTIME_STORE"),
  PLUGIN_DISCOVERY_SERVICE: createToken<PluginDiscoveryService>(
    "CMS_CORE_PLUGIN_DISCOVERY_SERVICE"
  ),
  DB_ADAPTER: createToken<DbAdapter>("CMS_CORE_DB_ADAPTER"),
  CACHE_ADAPTER: createToken<CacheAdapter>("CMS_CORE_CACHE_ADAPTER"),
  ENTITY_REGISTRY: createToken<EntityRegistry>("CMS_CORE_ENTITY_REGISTRY"),
  AUTHZ_SERVICE: createToken<AuthzService>("CMS_CORE_AUTHZ_SERVICE"),
  PLUGIN_MANIFEST_PROVISIONER: createToken<PluginManifestProvisioner>(
    "CMS_CORE_PLUGIN_MANIFEST_PROVISIONER"
  ),
  SECURE_EVENT_PAYLOAD_STORE: createToken<SecureEventPayloadStore>(
    "CMS_CORE_SECURE_EVENT_PAYLOAD_STORE"
  ),
  SECURE_EVENT_PAYLOAD_AUTHORIZER: createToken<SecureEventPayloadAuthorizer>(
    "CMS_CORE_SECURE_EVENT_PAYLOAD_AUTHORIZER"
  ),
  PLUGIN_EVENT_SUBSCRIPTION_AUTHORIZER: createToken<PluginEventSubscriptionAuthorizer>(
    "CMS_CORE_PLUGIN_EVENT_SUBSCRIPTION_AUTHORIZER"
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
