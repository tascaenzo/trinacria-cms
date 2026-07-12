import type { PluginManifest } from "./plugin-manifest.js";

/**
 * Optional kernel capability used to provision plugin-contributed security models.
 * Implementations typically upsert permissions/roles/grants on plugin load and
 * remove plugin-owned contributions on plugin uninstall.
 */
export interface PluginSecurityProvisioner {
  provision(manifest: PluginManifest): Promise<void>;
  deprovision(manifest: PluginManifest): Promise<void>;
  defer?(manifest: PluginManifest): Promise<void> | void;
  provisionDeferred?(): Promise<void>;
}
