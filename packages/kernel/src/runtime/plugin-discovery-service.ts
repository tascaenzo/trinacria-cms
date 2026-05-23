import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type {
  PluginDiscoveryResult,
  PluginDiscoveryService,
  PluginDiscoverySource,
  PluginSourceSnapshot
} from "../contracts/plugin-discovery.js";
import type { KernelPluginDefinition } from "../contracts/plugin-runtime.js";
import type { PluginManifest } from "../contracts/plugin-manifest.js";
import { PluginManifestError } from "../errors/plugin-errors.js";
import { validatePluginManifest } from "./plugin-manifest-validation.js";

export interface ConfiguredPluginDiscoveryServiceOptions {
  importer?: (entrypoint: string, source: PluginDiscoverySource) => Promise<unknown>;
  continueOnError?: boolean;
}

/**
 * Discovery from explicit configured sources. It does not scan the filesystem
 * and does not install packages at runtime.
 */
export class ConfiguredPluginDiscoveryService implements PluginDiscoveryService {
  private readonly importer: (
    entrypoint: string,
    source: PluginDiscoverySource
  ) => Promise<unknown>;
  private readonly continueOnError: boolean;

  constructor(options: ConfiguredPluginDiscoveryServiceOptions = {}) {
    this.importer = options.importer ?? defaultImporter;
    this.continueOnError = options.continueOnError ?? false;
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
        const loaded = await this.importer(resolveEntrypoint(source), source);
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

function resolveEntrypoint(source: PluginDiscoverySource): string {
  if (source.type !== "local-path") {
    return source.entrypoint;
  }

  if (source.entrypoint.startsWith("file://")) {
    return source.entrypoint;
  }

  const absolutePath = isAbsolute(source.entrypoint)
    ? source.entrypoint
    : resolve(process.cwd(), source.entrypoint);
  return pathToFileURL(absolutePath).href;
}

async function defaultImporter(entrypoint: string): Promise<unknown> {
  return import(entrypoint);
}

function normalizeDiscoveredPlugin(
  loaded: unknown,
  source: PluginDiscoverySource
): KernelPluginDefinition {
  const moduleRecord = isRecord(loaded) ? loaded : {};
  const candidate =
    moduleRecord.default ??
    moduleRecord.plugin ??
    moduleRecord.cmsPlugin ??
    moduleRecord.definition;

  if (!isRecord(candidate) || !isRecord(candidate.manifest)) {
    throw new PluginManifestError(
      `Plugin source "${source.name}" does not export a plugin definition`,
      {
        source
      }
    );
  }

  const manifest = validatePluginManifest(candidate.manifest as unknown as PluginManifest);
  return {
    ...(candidate as Omit<KernelPluginDefinition, "manifest">),
    manifest,
    modules: Array.isArray(candidate.modules) ? candidate.modules : []
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
