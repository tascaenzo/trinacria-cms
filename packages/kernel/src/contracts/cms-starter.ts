import type { ModuleDefinition } from "@trinacria/core";
import type { Provider } from "@trinacria/core";
import type { HttpMiddleware, OpenApiDocument } from "@trinacria/http";
import type {
  PluginDiscoveryService,
  PluginDiscoverySource,
  PluginSourceSnapshot
} from "./plugin-discovery.js";
import type { KernelPluginDefinition, PluginRuntime } from "./plugin-runtime.js";
import type { PluginRuntimeStore } from "./plugin-runtime-store.js";

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
  /**
   * Optional discovery service override for tests or custom host applications.
   * When omitted, the starter uses ConfiguredPluginDiscoveryService.
   */
  pluginDiscoveryService?: PluginDiscoveryService;
  continueOnPluginDiscoveryError?: boolean;
  enableHealthModule?: boolean;
  /**
   * Enables automatic calls to a registered PluginSecurityProvisioner
   * on plugin load/unregister lifecycle.
   */
  enablePluginSecurityProvisioning?: boolean;
  autoLoadPlugins?: boolean;
  /**
   * Optional custom persistence backend for plugin runtime state.
   * If omitted, the starter auto-selects a default store (DbAdapter-backed when available).
   */
  pluginRuntimeStore?: PluginRuntimeStore;
}

/**
 * Runtime handle returned by the CMS starter.
 */
export interface CmsStarterHandle {
  runtime: PluginRuntime;
  pluginSources: readonly PluginSourceSnapshot[];
  shutdown(): Promise<void>;
}
