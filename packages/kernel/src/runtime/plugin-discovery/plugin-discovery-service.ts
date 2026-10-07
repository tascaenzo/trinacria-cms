import type {
  PluginDiscoveryResult,
  PluginDiscoveryService,
  PluginDiscoverySource,
  PluginSourceSnapshot
} from "../../contracts/plugin-discovery.js";
import type { KernelPluginDefinition } from "../../contracts/plugin-runtime.js";
import { PluginManifestError } from "../../errors/plugin-errors.js";
import {
  defaultImporter,
  errorToMessage,
  normalizeDiscoveredPlugin,
  resolveEntrypoint
} from "./plugin-source-normalization.js";

export interface ConfiguredPluginDiscoveryServiceOptions {
  importer?: (entrypoint: string, source: PluginDiscoverySource) => Promise<unknown>;
  continueOnError?: boolean;
  allowedRoots?: readonly string[];
  resolveModule?: (entrypoint: string) => string;
}

export class ConfiguredPluginDiscoveryService implements PluginDiscoveryService {
  private readonly importer: (
    entrypoint: string,
    source: PluginDiscoverySource
  ) => Promise<unknown>;
  private readonly continueOnError: boolean;
  private readonly allowedRoots: readonly string[];
  private readonly resolveModule?: (entrypoint: string) => string;

  constructor(options: ConfiguredPluginDiscoveryServiceOptions = {}) {
    this.importer = options.importer ?? defaultImporter;
    this.continueOnError = options.continueOnError ?? false;
    this.allowedRoots = [...(options.allowedRoots ?? [process.cwd()])];
    this.resolveModule = options.resolveModule;
  }

  async discover(sources: readonly PluginDiscoverySource[]): Promise<PluginDiscoveryResult> {
    const plugins: KernelPluginDefinition[] = [];
    const snapshots: PluginSourceSnapshot[] = [];

    for (const source of sources) {
      if (source.enabledByDefault === false) {
        snapshots.push(this.toSnapshot(source, "disabled"));
        continue;
      }

      try {
        const supportedKeys = ["type", "name", "entrypoint", "enabledByDefault"];
        if (Object.keys(source).some((key) => !supportedKeys.includes(key)))
          throw new PluginManifestError("Unsupported plugin source configuration");
        const entrypoint = await resolveEntrypoint(source, this.allowedRoots, this.resolveModule);
        if (new URL(entrypoint).pathname.endsWith(".json"))
          throw new PluginManifestError(
            "Plugin sources must export an executable plugin definition"
          );
        const loaded = await this.importer(entrypoint, source);
        const plugin = normalizeDiscoveredPlugin(loaded, source);
        plugins.push(plugin);
        snapshots.push(this.toSnapshot(source, "discovered", plugin.manifest.id));
      } catch (error) {
        const snapshot = this.toSnapshot(source, "failed", undefined, errorToMessage(error));
        snapshots.push(snapshot);
        if (!this.continueOnError) {
          throw new PluginManifestError(`Plugin source "${source.name}" discovery failed`, {
            source,
            error: snapshot.error
          });
        }
      }
    }

    return { plugins, sources: snapshots };
  }

  private toSnapshot(
    source: PluginDiscoverySource,
    status: PluginSourceSnapshot["status"],
    pluginId?: string,
    error?: string
  ): PluginSourceSnapshot {
    return {
      type: source.type,
      name: source.name,
      entrypoint: source.entrypoint,
      status,
      ...(pluginId ? { pluginId } : {}),
      ...(error ? { error } : {})
    };
  }
}
