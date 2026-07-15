import type { PluginManifest } from "@trinacria-cms/kernel";
import { I18nBundlesRepository } from "./i18n-bundles.repository.js";

/** Synchronizes plugin manifests with the persistent translation registry. */
export class I18nBundlesService {
  constructor(private readonly bundles: I18nBundlesRepository) {}

  async syncManifest(manifest: PluginManifest): Promise<void> {
    const pluginId = manifest.id.trim().toLowerCase();
    const desired = new Set(
      (manifest.i18n?.bundles ?? []).map((bundle) => `${pluginId}:${bundle.namespace}|${bundle.locale}`)
    );

    for (const bundle of manifest.i18n?.bundles ?? []) {
      await this.bundles.upsert({
        pluginId,
        namespace: `${pluginId}:${bundle.namespace}`,
        locale: bundle.locale,
        fallbackLocale: manifest.i18n?.fallbackLocale ?? "en",
        messages: { ...bundle.messages }
      });
    }

    for (const existing of await this.bundles.listByPlugin(pluginId)) {
      if (!desired.has(`${existing.namespace}|${existing.locale}`)) {
        await this.bundles.deleteById(existing.id);
      }
    }
  }

  async removePlugin(pluginId: string): Promise<void> {
    for (const bundle of await this.bundles.listByPlugin(pluginId)) {
      await this.bundles.deleteById(bundle.id);
    }
  }

  /** Returns one cacheable dictionary, falling back to every plugin's English bundle. */
  async resolveLocale(locale: string, namespace?: string, surface?: string): Promise<{
    locale: string;
    fallbackLocale: "en";
    namespace?: string;
    messages: Readonly<Record<string, string>>;
  }> {
    const normalizedLocale = locale.trim();
    const filterSurface = (bundles: readonly Awaited<ReturnType<I18nBundlesRepository["listByLocale"]>>[number][]) =>
      surface ? bundles.filter((bundle) => bundle.namespace.endsWith(`:${surface}`)) : bundles;
    const fallbackBundles = filterSurface(await this.bundles.listByLocale("en", namespace));
    const selectedBundles =
      normalizedLocale === "en"
        ? fallbackBundles
        : filterSurface(await this.bundles.listByLocale(normalizedLocale, namespace));
    const messages: Record<string, string> = {};

    for (const bundle of fallbackBundles) Object.assign(messages, bundle.messages);
    for (const bundle of selectedBundles) Object.assign(messages, bundle.messages);

    return {
      locale: normalizedLocale,
      fallbackLocale: "en",
      ...(namespace ? { namespace } : {}),
      messages
    };
  }
}
