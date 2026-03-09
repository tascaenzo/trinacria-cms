/**
 * Static catalog describing what the published default SDK covers without
 * any project-local regeneration.
 */
export interface OfficialSdkPluginCatalogEntry {
  pluginId: string;
  apiGroups: readonly string[];
  description: string;
}

/**
 * Current official SDK coverage.
 * Additional official plugins can extend this list without changing the
 * generation model for custom monorepo overlays.
 */
export const OFFICIAL_SDK_PLUGIN_CATALOG: readonly OfficialSdkPluginCatalogEntry[] =
  Object.freeze([
    {
      pluginId: "kernel",
      apiGroups: ["kernelHealth", "system"],
      description: "Built-in kernel diagnostics and runtime discovery APIs",
    },
    {
      pluginId: "core-pack",
      apiGroups: [
        "auth",
        "installation",
        "users",
        "roles",
        "permissions",
        "security",
        "settings",
      ],
      description: "Official identity, installation, security, and settings APIs",
    },
  ]);
