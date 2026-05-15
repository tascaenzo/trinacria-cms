import type { AdminRuntimePluginInfo } from "../contracts.js";
import { cms } from "./cms-sdk.js";

/**
 * Runtime discovery is mapped into a frontend-friendly shape so the admin
 * shell does not need backend response types spread across every screen.
 */
export async function loadRuntimePluginInfo(): Promise<readonly AdminRuntimePluginInfo[]> {
  const [plugins, capabilities] = await Promise.all([
    cms.system.listInstalledPlugins(),
    cms.system.listInstalledCapabilities()
  ]);

  const capabilityMap = new Map<string, Set<string>>();
  for (const entry of capabilities.data) {
    const list = capabilityMap.get(entry.pluginId);
    if (list) {
      list.add(entry.capability);
    } else {
      capabilityMap.set(entry.pluginId, new Set([entry.capability]));
    }
  }

  return plugins.data.map((plugin) => ({
    pluginId: plugin.id,
    installed: plugin.state !== "unloaded",
    version: plugin.version,
    state: plugin.state,
    capabilities: Array.from(capabilityMap.get(plugin.id) ?? [])
  }));
}
