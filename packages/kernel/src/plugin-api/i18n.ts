import type {
  PluginManifestI18n,
  PluginManifestTranslationBundle
} from "../contracts/plugin-manifest.js";

/** Declares one locale dictionary owned by the current plugin. */
export function defineTranslationBundle(
  input: PluginManifestTranslationBundle
): PluginManifestTranslationBundle {
  return { namespace: input.namespace, locale: input.locale, messages: { ...input.messages } };
}

/** Declares plugin translations and the mandatory English fallback. */
export function defineI18n(input: PluginManifestI18n): PluginManifestI18n {
  return {
    fallbackLocale: "en",
    bundles: input.bundles.map((bundle) => defineTranslationBundle(bundle))
  };
}
