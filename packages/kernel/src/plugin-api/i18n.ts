import type {
  PluginManifestI18n,
  PluginManifestTranslationNamespace
} from "../contracts/plugin-manifest.js";

/** Declares one lightweight namespace whose messages remain in package assets. */
export function defineTranslationNamespace(
  input: PluginManifestTranslationNamespace
): PluginManifestTranslationNamespace {
  return {
    id: input.id,
    surface: input.surface,
    locales: [...input.locales],
    source: input.source
  };
}

/** Declares plugin translations and the mandatory English fallback. */
export function defineI18n(input: PluginManifestI18n): PluginManifestI18n {
  return {
    fallbackLocale: "en",
    namespaces: input.namespaces.map((namespace) => defineTranslationNamespace(namespace))
  };
}
