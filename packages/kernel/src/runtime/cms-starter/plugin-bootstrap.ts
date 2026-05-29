import type {
  PluginDiscoveryService,
  PluginDiscoverySource,
  PluginSourceSnapshot
} from "../../contracts/plugin-discovery.js";
import type { KernelPluginDefinition, PluginRuntime } from "../../contracts/plugin-runtime.js";

export interface PluginBootstrapOptions {
  runtime: Pick<PluginRuntime, "register" | "loadMany" | "list"> & {
    reconcileDiscoveredPlugins?(pluginIds: readonly string[]): Promise<void>;
  };
  discoveryService: PluginDiscoveryService;
  pluginSources: readonly PluginDiscoverySource[];
  plugins?: readonly KernelPluginDefinition[];
  autoLoadPlugins?: boolean;
}

export interface PluginBootstrapResult {
  plugins: readonly KernelPluginDefinition[];
  pluginSources: readonly PluginSourceSnapshot[];
}

export async function bootstrapDiscoveredPlugins(
  options: PluginBootstrapOptions
): Promise<PluginBootstrapResult> {
  const discovery = await options.discoveryService.discover(options.pluginSources);
  const plugins = [...(options.plugins ?? []), ...discovery.plugins];

  for (const plugin of plugins) {
    await options.runtime.register(plugin);
  }

  await options.runtime.reconcileDiscoveredPlugins?.(plugins.map((plugin) => plugin.manifest.id));

  if (options.autoLoadPlugins !== false && plugins.length > 0) {
    const autoloadPluginIds = plugins
      .map((plugin) => plugin.manifest.id)
      .filter((pluginId) => {
        const record = options.runtime.list().find((item) => item.manifest.id === pluginId);
        return record ? ["registered", "unloaded"].includes(record.state) : false;
      });

    if (autoloadPluginIds.length > 0) {
      await options.runtime.loadMany(autoloadPluginIds);
    }
  }

  return {
    plugins,
    pluginSources: discovery.sources
  };
}
