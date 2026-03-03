import type { ModuleDefinition } from "@trinacria/core";
import type { Provider } from "@trinacria/core";
import type {
  KernelPluginDefinition,
  PluginRuntime,
} from "./plugin-runtime.js";

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
  autoLoadPlugins?: boolean;
}

/**
 * Runtime handle returned by the CMS starter.
 */
export interface CmsStarterHandle {
  runtime: PluginRuntime;
  shutdown(): Promise<void>;
}
