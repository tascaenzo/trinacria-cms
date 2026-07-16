import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import {
  TranslationMessageRecordSchema,
  type TranslationMessageRecord
} from "./i18n-messages.schemas.js";

const ENTITY_NAME = "i18n_messages";

export class I18nMessagesRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async upsert(input: Omit<TranslationMessageRecord, "id" | "createdAt" | "updatedAt">) {
    const pluginId = input.pluginId.trim().toLowerCase();
    const namespace = input.namespace.trim();
    const locale = input.locale.trim();
    const key = input.key.trim();
    const existing = await this.repository().findOne({
      filter: { pluginId, namespace, locale, key },
      parse: (value: unknown) => TranslationMessageRecordSchema.parse(value)
    });
    const now = new Date().toISOString();

    if (!existing) {
      return TranslationMessageRecordSchema.parse(
        await this.repository().insertOne({
          ...input,
          pluginId,
          namespace,
          locale,
          key,
          createdAt: now,
          updatedAt: now
        })
      );
    }

    const updated = await this.repository().updateOne(
      { filter: { id: existing.id } },
      {
        surface: input.surface,
        source: input.source,
        value: input.value,
        sourceVersion: input.sourceVersion,
        updatedAt: now
      }
    );
    if (!updated) {
      throw new Error(`Translation message "${namespace}:${locale}:${key}" disappeared during upsert`);
    }
    return TranslationMessageRecordSchema.parse(updated);
  }

  async listByPlugin(pluginId: string): Promise<readonly TranslationMessageRecord[]> {
    return this.repository().findMany({
      filter: { pluginId: pluginId.trim().toLowerCase() },
      sort: { namespace: "asc", locale: "asc", key: "asc" },
      parse: (value: unknown) => TranslationMessageRecordSchema.parse(value)
    });
  }

  async listByLocale(
    locale: string,
    namespace?: string,
    surface?: string
  ): Promise<readonly TranslationMessageRecord[]> {
    return this.repository().findMany({
      filter: {
        locale: locale.trim(),
        ...(namespace ? { namespace: namespace.trim() } : {}),
        ...(surface ? { surface: surface.trim() } : {})
      },
      sort: { pluginId: "asc", namespace: "asc", key: "asc" },
      parse: (value: unknown) => TranslationMessageRecordSchema.parse(value)
    });
  }

  async deleteById(id: string): Promise<boolean> {
    return this.repository().deleteOne({ filter: { id } });
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<TranslationMessageRecord>(ENTITY_NAME);
  }
}
