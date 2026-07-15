import type { PluginManifest } from "./plugin-manifest.js";

/**
 * Kernel lifecycle capability that materializes a plugin manifest in the Core.
 *
 * Implementations synchronously provision manifest-owned resources (security,
 * settings, translations, migrations, and future domains) when a plugin loads,
 * and reverse that work before it is unregistered.
 */
export interface PluginManifestProvisioner {
  provision(manifest: PluginManifest): Promise<void>;
  deprovision(manifest: PluginManifest): Promise<void>;
  defer?(manifest: PluginManifest): Promise<void> | void;
  provisionDeferred?(): Promise<void>;
}
