import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { KernelPluginDefinition } from "../../contracts/plugin-runtime.js";
import type { PluginDiscoverySource } from "../../contracts/plugin-discovery.js";
import type { PluginManifest } from "../../contracts/plugin-manifest.js";
import { PluginManifestError } from "../../errors/plugin-errors.js";
import { validatePluginManifest } from "../plugin-manifest/plugin-manifest-validation.js";

export function resolveEntrypoint(source: PluginDiscoverySource): string {
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

export async function defaultImporter(entrypoint: string): Promise<unknown> {
  return import(entrypoint);
}

export function normalizeDiscoveredPlugin(
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
      { source }
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

export function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
