import type { PluginManifest } from "../contracts/plugin-manifest.js";
import { normalizeCapability, normalizePluginId, omitEmptyArray } from "./naming.js";

export type DefinePluginManifestInput = PluginManifest;

export function definePluginManifest(input: DefinePluginManifestInput): PluginManifest {
  const capabilities = omitEmptyArray(input.capabilities)?.map(normalizeCapability);
  const dependencies = omitEmptyArray(input.dependencies);
  const entities = omitEmptyArray(input.entities);
  const settings = omitEmptyArray(input.settings);
  const events = compactSection(input.events);
  const i18n = compactSection(input.i18n);
  const admin = compactSection(input.admin);
  const security = compactSection(input.security);

  return {
    id: normalizePluginId(input.id),
    ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    version: input.version,
    requiresCore: input.requiresCore,
    ...(capabilities !== undefined ? { capabilities } : {}),
    ...(dependencies !== undefined ? { dependencies } : {}),
    ...(entities !== undefined ? { entities } : {}),
    ...(settings !== undefined ? { settings } : {}),
    ...(events !== undefined ? { events } : {}),
    ...(i18n !== undefined ? { i18n } : {}),
    ...(admin !== undefined ? { admin } : {}),
    ...(security !== undefined ? { security } : {})
  };
}

function compactSection<T extends object>(section: T | undefined): T | undefined {
  if (!section) {
    return undefined;
  }

  const entries = Object.entries(section as Record<string, unknown>).filter(([, value]) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined;
  });

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries) as T;
}
