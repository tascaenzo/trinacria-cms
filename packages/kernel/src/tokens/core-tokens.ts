import { createToken } from "@trinacria/core";
import type { AuditSink } from "../contracts/audit.js";
import type { AuthzService } from "../contracts/authz-service.js";
import type { CacheAdapter } from "../contracts/cache-adapter.js";
import type { DbAdapter } from "../contracts/db-adapter.js";
import type { KernelAdminRouteGuard } from "../contracts/kernel-admin-route-guard.js";
import type { OperationAuthorizer } from "../contracts/operations.js";
import type { PluginEventSubscriptionAuthorizer } from "../contracts/plugin-access-policy.js";
import type { PluginDiscoveryService } from "../contracts/plugin-discovery.js";
import type {
  PluginOperationAuthorizer,
  PluginSettingsHost
} from "../contracts/plugin-host-services.js";
import type { PluginManifestProvisioner } from "../contracts/plugin-manifest-provisioner.js";
import type { PluginNonceStore } from "../contracts/plugin-nonce-store.js";
import type { PluginRuntime } from "../contracts/plugin-runtime.js";
import type { PluginRuntimeStore } from "../contracts/plugin-runtime-store.js";
import type { SecureEventPayloadAuthorizer } from "../contracts/secure-event-payloads.js";
import type { PluginClusterCoordinator } from "../runtime/cluster/plugin-cluster.js";
import type { MongoDurableEventStore } from "../runtime/durable-events/durable-events.js";
import type { SecureEmailJobStore } from "../runtime/durable-events/secure-email-jobs.js";
import type { EntityRegistry } from "../runtime/persistence/entity-registry.js";
import type { SecureEventPayloadHost } from "../runtime/secure-payloads/secure-event-payloads.service.js";
import type { KernelHealthService } from "../runtime/system/kernel-health-service.js";
import type { KernelSystemService } from "../runtime/system/kernel-system-service.js";

/**
 * Core DI tokens exposed as stable integration points for platform services.
 */
export const CORE_TOKENS = {
  PUBLIC_REQUEST_LIMITER: createToken<{ consume(clientId: string): Promise<void> }>(
    "CMS_PUBLIC_REQUEST_LIMITER"
  ),
  SECURE_EMAIL_JOBS: createToken<SecureEmailJobStore>("CMS_SECURE_EMAIL_JOBS"),
  DURABLE_EVENTS: createToken<MongoDurableEventStore>("CMS_DURABLE_EVENTS"),
  AUDIT_SINK: createToken<AuditSink>("CORE_AUDIT_SINK"),
  PLUGIN_CLUSTER_COORDINATOR: createToken<PluginClusterCoordinator>(
    "CORE_PLUGIN_CLUSTER_COORDINATOR"
  ),
  HTTP_ACCESS_COOKIE_NAME: createToken<() => Promise<string>>("CMS_HTTP_ACCESS_COOKIE_NAME"),
  OPERATION_AUTHORIZER: createToken<OperationAuthorizer>("CMS_OPERATION_AUTHORIZER"),
  OPERATION_POLICY: createToken<OperationAuthorizer>("CMS_OPERATION_POLICY"),
  PLUGIN_SETTINGS_HOST: createToken<PluginSettingsHost>("CMS_PLUGIN_SETTINGS_HOST"),
  PLUGIN_OPERATION_AUTHORIZER: createToken<PluginOperationAuthorizer>(
    "CMS_PLUGIN_OPERATION_AUTHORIZER"
  ),
  PLUGIN_RUNTIME: createToken<PluginRuntime>("CMS_CORE_PLUGIN_RUNTIME"),
  /** Read-only host view available to modules loaded after the starter. */
  PLUGIN_RUNTIME_VIEW: createToken<{
    list(): Promise<ReturnType<PluginRuntime["list"]>>;
  }>("CMS_PLUGIN_RUNTIME_VIEW"),
  PLUGIN_RUNTIME_STORE: createToken<PluginRuntimeStore>("CMS_CORE_PLUGIN_RUNTIME_STORE"),
  PLUGIN_DISCOVERY_SERVICE: createToken<PluginDiscoveryService>(
    "CMS_CORE_PLUGIN_DISCOVERY_SERVICE"
  ),
  PLUGIN_NONCE_STORE: createToken<PluginNonceStore>("CMS_PLUGIN_NONCE_STORE"),
  DB_ADAPTER: createToken<DbAdapter>("CMS_CORE_DB_ADAPTER"),
  CACHE_ADAPTER: createToken<CacheAdapter>("CMS_CORE_CACHE_ADAPTER"),
  ENTITY_REGISTRY: createToken<EntityRegistry>("CMS_CORE_ENTITY_REGISTRY"),
  AUTHZ_SERVICE: createToken<AuthzService>("CMS_CORE_AUTHZ_SERVICE"),
  PLUGIN_MANIFEST_PROVISIONER: createToken<PluginManifestProvisioner>(
    "CMS_CORE_PLUGIN_MANIFEST_PROVISIONER"
  ),
  SECURE_EVENT_PAYLOAD_HOST: createToken<SecureEventPayloadHost>(
    "CMS_CORE_SECURE_EVENT_PAYLOAD_HOST"
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
