/**
 * Lightweight discovery shapes used by helper functions.
 * They intentionally rely on structure instead of generated types so the
 * helpers remain stable even when OpenAPI evolves.
 */
export interface InstalledPluginLike {
  id: string;
  capabilities?: readonly string[];
}

export interface CapabilityLike {
  pluginId: string;
  capability: string;
}

/**
 * Indexes capability names by plugin id for quick lookups in UI or backend code.
 */
export function indexCapabilitiesByPlugin(
  capabilities: readonly CapabilityLike[]
): ReadonlyMap<string, readonly string[]> {
  const byPlugin = new Map<string, string[]>();

  for (const capability of capabilities) {
    const list = byPlugin.get(capability.pluginId) ?? [];
    list.push(capability.capability);
    byPlugin.set(capability.pluginId, list);
  }

  return new Map(
    [...byPlugin.entries()].map(([pluginId, values]) => [pluginId, [...new Set(values)].sort()])
  );
}

/**
 * Returns true when discovery data contains the given plugin id.
 */
export function isPluginInstalled(
  plugins: readonly InstalledPluginLike[],
  pluginId: string
): boolean {
  const normalized = pluginId.trim().toLowerCase();
  return plugins.some((plugin) => plugin.id.trim().toLowerCase() === normalized);
}

/**
 * Returns true when one plugin exposes a specific capability.
 */
export function hasCapability(
  capabilities: readonly CapabilityLike[],
  capabilityName: string,
  pluginId?: string
): boolean {
  const normalizedCapability = capabilityName.trim().toLowerCase();
  const normalizedPluginId = pluginId?.trim().toLowerCase();

  return capabilities.some((item) => {
    if (item.capability.trim().toLowerCase() !== normalizedCapability) {
      return false;
    }
    if (!normalizedPluginId) {
      return true;
    }
    return item.pluginId.trim().toLowerCase() === normalizedPluginId;
  });
}
