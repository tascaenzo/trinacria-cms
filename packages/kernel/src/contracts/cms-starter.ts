import type { ModuleDefinition } from "@trinacria/core";
import type { Provider } from "@trinacria/core";
import type { OpenApiDocument } from "@trinacria/http";
import type { KernelPluginDefinition, PluginRuntime } from "./plugin-runtime.js";
import type { PluginRuntimeStore } from "./plugin-runtime-store.js";

/**
 * HTTP bootstrap configuration for the CMS starter.
 */
export interface CmsHttpConfig {
  host?: string;
  port?: number;
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
  swaggerUi?: CmsSwaggerUiConfig;
  modules?: readonly ModuleDefinition[];
  globalProviders?: readonly Provider[];
  plugins?: readonly KernelPluginDefinition[];
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
  shutdown(): Promise<void>;
}
