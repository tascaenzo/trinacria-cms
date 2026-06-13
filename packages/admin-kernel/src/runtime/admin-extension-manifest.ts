import type { AdminExtensionManifest, SafeAdminExtensionManifest } from "../contracts.js";
import { renderDeclarativeAdminPage } from "../declarative/index.js";
import {
  sanitizeAdminExtensionManifest,
  type AdminEndpointPolicyOptions
} from "./admin-manifest-sanitizer.js";
import type { RenderableAdminContribution } from "./admin-route-runtime.js";

const safeManifestRegistry = new WeakSet<AdminExtensionManifest>();

/**
 * Converts an already-sanitized plugin-authoring manifest into the flattened
 * contribution shape consumed by the registry.
 */
export function normalizeAdminExtensionManifest(
  manifest: SafeAdminExtensionManifest
): RenderableAdminContribution {
  assertSafeAdminExtensionManifest(manifest);

  return {
    pluginId: manifest.pluginId,
    displayName: manifest.displayName,
    displayNameKey: manifest.displayNameKey,
    routes: (manifest.admin?.pages ?? []).map((page) => ({
      ...page,
      render: renderDeclarativeAdminPage
    })),
    navigation: manifest.admin?.navigation ?? [],
    resources: manifest.admin?.resources,
    widgets: manifest.admin?.dashboard?.widgets,
    settings: manifest.admin?.settings?.sections
  };
}

export function normalizeAdminExtensionManifests(
  manifests: readonly SafeAdminExtensionManifest[]
): readonly RenderableAdminContribution[] {
  return manifests.map((manifest) => normalizeAdminExtensionManifest(manifest));
}

/** Safe default for raw manifests loaded from APIs or plugin packages. */
export function normalizeSafeAdminExtensionManifest(
  manifest: AdminExtensionManifest,
  options: AdminEndpointPolicyOptions = {}
): RenderableAdminContribution {
  return normalizeAdminExtensionManifest(toSafeAdminExtensionManifest(manifest, options));
}

export function normalizeSafeAdminExtensionManifests(
  manifests: readonly AdminExtensionManifest[],
  options: AdminEndpointPolicyOptions = {}
): readonly RenderableAdminContribution[] {
  return manifests.map((manifest) => normalizeSafeAdminExtensionManifest(manifest, options));
}

export function toSafeAdminExtensionManifest(
  manifest: AdminExtensionManifest,
  options: AdminEndpointPolicyOptions = {}
): SafeAdminExtensionManifest {
  const safeManifest = sanitizeAdminExtensionManifest(manifest, options);
  safeManifestRegistry.add(safeManifest);
  return safeManifest as SafeAdminExtensionManifest;
}

function assertSafeAdminExtensionManifest(manifest: SafeAdminExtensionManifest): void {
  if (!safeManifestRegistry.has(manifest)) {
    throw new Error(
      "Unsafe admin extension manifest. Use toSafeAdminExtensionManifest() before normalization."
    );
  }
}
