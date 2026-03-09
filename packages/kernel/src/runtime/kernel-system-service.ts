import type { PluginManifest } from "../contracts/plugin-manifest.js";
import type {
  PluginRuntime,
  PluginRuntimeRecord,
  PluginState,
} from "../contracts/plugin-runtime.js";

export interface KernelInstalledPluginSnapshot {
  id: string;
  version: string;
  requiresCore: string;
  state: PluginState;
  capabilities: readonly string[];
  dependencies: readonly {
    pluginId: string;
    versionRange: string;
    optional: boolean;
  }[];
  security: {
    permissions: number;
    roles: number;
    grants: number;
    policyRules: number;
  };
  loadedAt?: string;
}

export interface KernelCapabilitySnapshot {
  pluginId: string;
  capability: string;
  version: string;
  state: PluginState;
}

/**
 * Read-only system discovery service exposing what the current CMS runtime
 * has actually registered and loaded.
 */
export class KernelSystemService {
  constructor(private readonly runtime: Pick<PluginRuntime, "list">) {}

  listInstalledPlugins(): readonly KernelInstalledPluginSnapshot[] {
    return this.runtime.list().map((record) => this.toPluginSnapshot(record));
  }

  listCapabilities(): readonly KernelCapabilitySnapshot[] {
    return this.runtime
      .list()
      .flatMap((record) => this.toCapabilitySnapshots(record.manifest, record.state));
  }

  private toPluginSnapshot(
    record: PluginRuntimeRecord,
  ): KernelInstalledPluginSnapshot {
    return {
      id: record.manifest.id,
      version: record.manifest.version,
      requiresCore: record.manifest.requiresCore,
      state: record.state,
      capabilities: [...(record.manifest.capabilities ?? [])],
      dependencies: (record.manifest.dependencies ?? []).map((dependency) => ({
        pluginId: dependency.pluginId,
        versionRange: dependency.versionRange,
        optional: dependency.optional ?? false,
      })),
      security: {
        permissions: record.manifest.security?.permissions?.length ?? 0,
        roles: record.manifest.security?.roles?.length ?? 0,
        grants: record.manifest.security?.grants?.length ?? 0,
        policyRules: record.manifest.security?.policyRules?.length ?? 0,
      },
      ...(record.loadedAt ? { loadedAt: record.loadedAt.toISOString() } : {}),
    };
  }

  private toCapabilitySnapshots(
    manifest: PluginManifest,
    state: PluginState,
  ): readonly KernelCapabilitySnapshot[] {
    return (manifest.capabilities ?? []).map((capability) => ({
      pluginId: manifest.id,
      capability,
      version: manifest.version,
      state,
    }));
  }
}
