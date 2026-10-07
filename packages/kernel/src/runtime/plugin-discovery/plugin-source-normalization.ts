import { realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { PluginDiscoverySource } from "../../contracts/plugin-discovery.js";
import type { PluginManifest } from "../../contracts/plugin-manifest.js";
import type { KernelPluginDefinition } from "../../contracts/plugin-runtime.js";
import { PluginManifestError } from "../../errors/plugin-errors.js";
import { validatePluginManifest } from "../plugin-manifest/plugin-manifest-validation.js";

export async function resolveEntrypoint(
  source: PluginDiscoverySource,
  allowedRoots: readonly string[],
  resolveModule: (entrypoint: string) => string = (entrypoint) => import.meta.resolve(entrypoint)
): Promise<string> {
  const entry = source.entrypoint;
  if (/^[a-z][a-z0-9+.-]*:/i.test(entry) && !entry.startsWith("file:"))
    throw new PluginManifestError("Only configured local plugin files are allowed");
  if (
    source.type === "package" &&
    (entry.startsWith(".") || isAbsolute(entry) || entry.startsWith("file:"))
  )
    throw new PluginManifestError("Package sources require a bare package entrypoint");
  const url = entry.startsWith("file:")
    ? new URL(entry)
    : source.type === "local-path" || isAbsolute(entry) || entry.startsWith(".")
      ? pathToFileURL(resolve(process.cwd(), entry))
      : new URL(resolveModule(entry));
  if (url.protocol !== "file:" || url.search || url.hash)
    throw new PluginManifestError(
      "Plugin entrypoint must resolve to a local file without query or fragment"
    );
  const target = await realpath(fileURLToPath(url));
  const roots = await Promise.all(allowedRoots.map((root) => realpath(root)));
  if (
    !roots.some((root) => {
      const child = relative(root, target);
      return (
        child === "" || (!child.startsWith(`..${sep}`) && child !== ".." && !isAbsolute(child))
      );
    })
  )
    throw new PluginManifestError("Plugin entrypoint escapes the host allowed roots");
  return pathToFileURL(target).href;
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
