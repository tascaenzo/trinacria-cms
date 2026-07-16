import type { PluginManifest, PluginTranslationSource } from "@trinacria-cms/kernel";
import { CacheService } from "../cache/services/cache.service.js";
import { I18nMessagesRepository } from "./i18n-messages.repository.js";

const CACHE_NAMESPACE = "i18n_messages";
const CACHE_TTL_SECONDS = 300;

interface ResolvedMessageInput {
  pluginId: string;
  namespace: string;
  surface: string;
  source: string;
  locale: string;
  key: string;
  value: string;
  sourceVersion: string;
}

/** Imports package assets into granular message records and resolves client dictionaries. */
export class I18nMessagesService {
  constructor(
    private readonly messages: I18nMessagesRepository,
    private readonly cache?: CacheService
  ) {}

  async syncManifest(
    manifest: PluginManifest,
    sources: readonly PluginTranslationSource[] = []
  ): Promise<void> {
    const desired = this.resolveManifestMessages(manifest, sources);
    const desiredKeys = new Set(
      desired.map((message) => `${message.namespace}|${message.locale}|${message.key}`)
    );

    for (const message of desired) {
      await this.messages.upsert(message);
    }

    const pluginId = manifest.id.trim().toLowerCase();
    for (const existing of await this.messages.listByPlugin(pluginId)) {
      if (!desiredKeys.has(`${existing.namespace}|${existing.locale}|${existing.key}`)) {
        await this.messages.deleteById(existing.id);
      }
    }
    await this.cache?.invalidate(CACHE_NAMESPACE);
  }

  async removePlugin(pluginId: string): Promise<void> {
    for (const message of await this.messages.listByPlugin(pluginId)) {
      await this.messages.deleteById(message.id);
    }
    await this.cache?.invalidate(CACHE_NAMESPACE);
  }

  /** Resolves English first and overlays the requested locale with a single indexed collection. */
  async resolveLocale(locale: string, namespace?: string, surface?: string): Promise<{
    locale: string;
    fallbackLocale: "en";
    namespace?: string;
    messages: Readonly<Record<string, string>>;
  }> {
    const normalizedLocale = locale.trim();
    const normalizedNamespace = namespace?.trim() || undefined;
    const normalizedSurface = surface?.trim() || undefined;
    const cacheKey = JSON.stringify([normalizedLocale, normalizedNamespace, normalizedSurface]);
    const load = async () => {
      const fallbackMessages = await this.messages.listByLocale(
        "en",
        normalizedNamespace,
        normalizedSurface
      );
      const selectedMessages =
        normalizedLocale === "en"
          ? fallbackMessages
          : await this.messages.listByLocale(normalizedLocale, normalizedNamespace, normalizedSurface);
      const messages: Record<string, string> = {};

      for (const message of fallbackMessages) messages[message.key] = message.value;
      for (const message of selectedMessages) messages[message.key] = message.value;

      return {
        locale: normalizedLocale,
        fallbackLocale: "en" as const,
        ...(normalizedNamespace ? { namespace: normalizedNamespace } : {}),
        messages
      };
    };

    return this.cache
      ? this.cache.getOrCompute(CACHE_NAMESPACE, cacheKey, load, CACHE_TTL_SECONDS)
      : load();
  }

  private resolveManifestMessages(
    manifest: PluginManifest,
    sources: readonly PluginTranslationSource[]
  ): readonly ResolvedMessageInput[] {
    const declarations = manifest.i18n?.namespaces ?? [];
    if (declarations.length === 0) {
      if (sources.length > 0) {
        throw new Error(`Plugin "${manifest.id}" ships i18n assets without an i18n manifest declaration`);
      }
      return [];
    }

    const sourceById = new Map<string, Map<string, PluginTranslationSource>>();
    for (const source of sources) {
      const byLocale = sourceById.get(source.source) ?? new Map<string, PluginTranslationSource>();
      if (byLocale.has(source.locale)) {
        throw new Error(`Plugin "${manifest.id}" declares duplicate i18n asset "${source.source}:${source.locale}"`);
      }
      byLocale.set(source.locale, source);
      sourceById.set(source.source, byLocale);
    }

    const desired: ResolvedMessageInput[] = [];
    for (const declaration of declarations) {
      const byLocale = sourceById.get(declaration.source);
      if (!byLocale) {
        throw new Error(`Plugin "${manifest.id}" is missing i18n assets for source "${declaration.source}"`);
      }

      for (const locale of declaration.locales) {
        const source = byLocale.get(locale);
        if (!source) {
          throw new Error(
            `Plugin "${manifest.id}" is missing i18n asset "${declaration.source}:${locale}"`
          );
        }
        for (const [key, value] of Object.entries(source.messages)) {
          desired.push({
            pluginId: manifest.id.trim().toLowerCase(),
            namespace: declaration.id,
            surface: declaration.surface,
            source: declaration.source,
            locale,
            key,
            value,
            sourceVersion: manifest.version
          });
        }
      }
    }
    return desired;
  }
}
