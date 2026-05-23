import type { KernelPluginDefinition } from "./plugin-runtime.js";

export type PluginDiscoverySourceType = "workspace" | "package" | "local-path";

export interface PluginDiscoverySource {
  type: PluginDiscoverySourceType;
  name: string;
  entrypoint: string;
  enabledByDefault?: boolean;
}

export type PluginSourceStatus = "discovered" | "failed" | "disabled";

export interface PluginSourceSnapshot {
  type: PluginDiscoverySourceType;
  name: string;
  entrypoint: string;
  status: PluginSourceStatus;
  pluginId?: string;
  error?: string;
}

export interface PluginDiscoveryResult {
  plugins: readonly KernelPluginDefinition[];
  sources: readonly PluginSourceSnapshot[];
}

export interface PluginDiscoveryService {
  discover(sources: readonly PluginDiscoverySource[]): Promise<PluginDiscoveryResult>;
}
