import type { ModuleDefinition, Provider } from "@trinacria/core";
import type { HttpMiddleware, OpenApiDocument } from "@trinacria/http";
import type {
  PluginDiscoveryService,
  PluginDiscoverySource,
  PluginSourceSnapshot
} from "./plugin-discovery.js";
import type {
  KernelPluginDefinition,
  PluginEventDeliveryDiagnostic,
  PluginRuntime
} from "./plugin-runtime.js";
import type { PluginRuntimeStore } from "./plugin-runtime-store.js";
import type { SecurePayloadKeyring } from "./secure-event-payloads.js";

/**
 * HTTP bootstrap configuration for the CMS starter.
 */
export interface CmsHttpConfig {
  host?: string;
  port?: number;
  middlewares?: HttpMiddleware[];
  openApi?: {
    enabled?: boolean;
    jsonPath?: string;
    title: string;
    version: string;
    description?: string;
    transformDocument?: (document: OpenApiDocument) => OpenApiDocument;
    onDocumentGenerated?: (document: OpenApiDocument) => void;
  };
}

export interface CmsSwaggerUiConfig {
  enabled?: boolean;
  path?: string;
  openApiJsonPath?: string;
  title?: string;
}

/**
 * Starter contract for bootstrapping a minimal CMS application.
 * App-specific modules and plugins can be injected at startup.
 */
export interface CmsStarterOptions {
  coreVersion: string;
  durableEvents?: { enabled?: boolean; concurrency?: number; pollMs?: number };
  /** Host-verified deployed artifact fingerprints; enables the shared control plane. */
  cluster?: {
    instanceId?: string;
    artifacts: Readonly<Record<string, import("./plugin-cluster.js").PluginArtifact>>;
    reconcileMs?: number;
    heartbeatMs?: number;
    leaseMs?: number;
    operationTimeoutMs?: number;
  };
  /** Explicit environment-only modules mounted when installation allows an unavailable database. */
  offlineInstallerModules?: readonly ModuleDefinition[];
  migrations?: {
    instanceId?: string;
    packageRoots?: Readonly<Record<string, string>>;
    /** Installation-only, while readiness remains database-degraded. */
    allowStartupWithoutDb?: boolean;
  };
  http?: CmsHttpConfig;
  /**
   * Enables Trinacria events plugin (`@trinacria/events`) for in-process pub/sub.
   * Enabled by default.
   */
  enableEventsPlugin?: boolean;
  swaggerUi?: CmsSwaggerUiConfig;
  modules?: readonly ModuleDefinition[];
  globalProviders?: readonly Provider[];
  plugins?: readonly KernelPluginDefinition[];
  pluginSources?: readonly PluginDiscoverySource[];
  /** Real filesystem roots allowed for configured plugin imports. Defaults to cwd. */
  pluginAllowedRoots?: readonly string[];
  /**
   * Optional discovery service override for tests or custom host applications.
   * When omitted, the starter uses ConfiguredPluginDiscoveryService.
   */
  pluginDiscoveryService?: PluginDiscoveryService;
  continueOnPluginDiscoveryError?: boolean;
  enableHealthModule?: boolean;
  /** Enables automatic calls to a PluginManifestProvisioner on plugin lifecycle. */
  enablePluginManifestProvisioning?: boolean;
  autoLoadPlugins?: boolean;
  /** Host keyring; falls back only to explicit secure-payload environment configuration. */
  securePayloads?: { keyring?: SecurePayloadKeyring; retentionMs?: number };
  /**
   * Optional custom persistence backend for plugin runtime state.
   * If omitted, the starter auto-selects a default store (DbAdapter-backed when available).
   */
  pluginRuntimeStore?: PluginRuntimeStore;
  /** Redacted delivery diagnostics; defaults to structured console warnings. */
  onPluginEventDeliveryDiagnostic?: (
    diagnostic: PluginEventDeliveryDiagnostic
  ) => void | Promise<void>;
}

/**
 * Runtime handle returned by the CMS starter.
 */
export interface CmsHttpRouteInfo {
  method: string;
  path: string;
  controllerName: string;
  publicApi: boolean;
  pluginId?: string;
  operationId?: string;
  exclusionReason?: string;
}

export interface CmsStarterHandle {
  startupMode: "cms" | "installer";
  runtime: PluginRuntime;
  pluginSources: readonly PluginSourceSnapshot[];
  getHttpRouteInventory(): readonly CmsHttpRouteInfo[];
  shutdown(): Promise<void>;
}
