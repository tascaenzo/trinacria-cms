import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import {
  TranslationBundleRecordSchema,
  type TranslationBundleRecord
} from "./i18n.schemas.js";

const ENTITY_NAME = "i18n_bundles";

export class I18nBundlesRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async upsert(input: Omit<TranslationBundleRecord, "id" | "createdAt" | "updatedAt">) {
    const pluginId = input.pluginId.trim().toLowerCase();
    const namespace = input.namespace.trim();
    const locale = input.locale.trim();
    const existing = await this.repository().findOne({
      filter: { pluginId, namespace, locale },
      parse: (value: unknown) => TranslationBundleRecordSchema.parse(value)
    });
    const now = new Date().toISOString();

    if (!existing) {
      return TranslationBundleRecordSchema.parse(
        await this.repository().insertOne({
          ...input,
          pluginId,
          namespace,
          locale,
          createdAt: now,
          updatedAt: now
        })
      );
    }

    const updated = await this.repository().updateOne(
      { filter: { id: existing.id } },
      { fallbackLocale: input.fallbackLocale, messages: { ...input.messages }, updatedAt: now }
    );
    if (!updated) {
      throw new Error(`Translation bundle "${namespace}:${locale}" disappeared during upsert`);
    }
    return TranslationBundleRecordSchema.parse(updated);
  }

  async listByPlugin(pluginId: string): Promise<readonly TranslationBundleRecord[]> {
    return this.repository().findMany({
      filter: { pluginId: pluginId.trim().toLowerCase() },
      sort: { locale: "asc" },
      parse: (value: unknown) => TranslationBundleRecordSchema.parse(value)
    });
  }

  async listByLocale(
    locale: string,
    namespace?: string
  ): Promise<readonly TranslationBundleRecord[]> {
    return this.repository().findMany({
      filter: { locale: locale.trim(), ...(namespace ? { namespace: namespace.trim() } : {}) },
      sort: { pluginId: "asc" },
      parse: (value: unknown) => TranslationBundleRecordSchema.parse(value)
    });
  }

  async deleteById(id: string): Promise<boolean> {
    return this.repository().deleteOne({ filter: { id } });
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<TranslationBundleRecord>(ENTITY_NAME);
  }
}
