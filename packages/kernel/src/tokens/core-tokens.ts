import { createToken } from "@trinacria/core";
import type { AuthzService } from "../contracts/authz-service.js";
import type { DbAdapter } from "../contracts/db-adapter.js";
import type { PluginRuntime } from "../contracts/plugin-runtime.js";
import type { KernelHealthService } from "../runtime/kernel-health-service.js";
import type { EntityRegistry } from "../runtime/entity-registry.js";

/**
 * Core DI tokens exposed as stable integration points for platform services.
 */
export const CORE_TOKENS = {
  PLUGIN_RUNTIME: createToken<PluginRuntime>("CMS_CORE_PLUGIN_RUNTIME"),
  DB_ADAPTER: createToken<DbAdapter>("CMS_CORE_DB_ADAPTER"),
  ENTITY_REGISTRY: createToken<EntityRegistry>("CMS_CORE_ENTITY_REGISTRY"),
  AUTHZ_SERVICE: createToken<AuthzService>("CMS_CORE_AUTHZ_SERVICE"),
  KERNEL_HEALTH_SERVICE: createToken<KernelHealthService>(
    "CMS_KERNEL_HEALTH_SERVICE",
  ),
  LOGGER: createToken<{
    info(message: string, metadata?: Record<string, unknown>): void;
    warn(message: string, metadata?: Record<string, unknown>): void;
    error(message: string, metadata?: Record<string, unknown>): void;
  }>("CMS_CORE_LOGGER"),
} as const;
