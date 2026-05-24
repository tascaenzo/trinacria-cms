import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import {
  SettingDefinitionRecordSchema,
  type SettingDefinitionRecord
} from "../schemas/settings.schemas.js";
import type { JsonValue } from "../_shared/settings-json.js";

const SETTINGS_ENTITY_NAME = "settings";
const DEFINITION_KIND = "definition" as const;

export interface UpsertSettingDefinitionRecordInput {
  key: string;
  ownerPluginId: string;
  category?: string;
  description?: string;
  schema?: JsonValue;
  defaultValue?: JsonValue;
  visibility?: "public" | "admin" | "internal";
  mutable?: boolean;
  secret?: boolean;
  status?: "active" | "disabled";
}

/**
 * Persistence adapter for settings definitions.
 */
export class SettingsDefinitionsRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async upsert(input: UpsertSettingDefinitionRecordInput): Promise<SettingDefinitionRecord> {
    const normalizedKey = input.key.trim().toLowerCase();
    const normalizedOwner = input.ownerPluginId.trim().toLowerCase();
    const existing = await this.findByKey(normalizedKey);
    const now = new Date().toISOString();

    if (!existing) {
      const created = await this.repository().insertOne({
        kind: DEFINITION_KIND,
        key: normalizedKey,
        ownerPluginId: normalizedOwner,
        ...(input.category?.trim() ? { category: input.category.trim() } : {}),
        ...(input.description?.trim() ? { description: input.description.trim() } : {}),
        ...(input.schema !== undefined ? { schema: input.schema } : {}),
        ...(input.defaultValue !== undefined ? { defaultValue: input.defaultValue } : {}),
        visibility: input.visibility ?? "public",
        mutable: input.mutable ?? true,
        secret: input.secret ?? false,
        status: input.status ?? "active",
        createdAt: now,
        updatedAt: now
      });
      return this.parseRecord(created);
    }

    if (existing.ownerPluginId !== normalizedOwner) {
      throw new Error(
        `Setting definition "${normalizedKey}" is owned by plugin "${existing.ownerPluginId}"`
      );
    }

    const updated = await this.repository().updateOne(
      { filter: { id: existing.id } },
      {
        ...(input.category?.trim() ? { category: input.category.trim() } : {}),
        ...(input.description?.trim() ? { description: input.description.trim() } : {}),
        ...(input.schema !== undefined ? { schema: input.schema } : {}),
        ...(input.defaultValue !== undefined ? { defaultValue: input.defaultValue } : {}),
        ...(input.visibility ? { visibility: input.visibility } : {}),
        ...(input.mutable !== undefined ? { mutable: input.mutable } : {}),
        ...(input.secret !== undefined ? { secret: input.secret } : {}),
        ...(input.status ? { status: input.status } : {}),
        updatedAt: now
      }
    );

    if (!updated) {
      throw new Error(`Setting definition "${normalizedKey}" disappeared during upsert`);
    }

    return this.parseRecord(updated);
  }

  async findByKey(key: string): Promise<SettingDefinitionRecord | null> {
    return this.repository().findOne({
      filter: { key: key.trim().toLowerCase(), kind: DEFINITION_KIND },
      parse: (value: unknown) => this.parseRecord(value)
    });
  }

  async list(options?: {
    ownerPluginId?: string;
    limit?: number;
    offset?: number;
  }): Promise<readonly SettingDefinitionRecord[]> {
    return this.repository().findMany({
      filter: {
        kind: DEFINITION_KIND,
        ...(options?.ownerPluginId
          ? { ownerPluginId: options.ownerPluginId.trim().toLowerCase() }
          : {})
      },
      limit: options?.limit,
      offset: options?.offset,
      sort: { createdAt: "desc" },
      parse: (value: unknown) => this.parseRecord(value)
    });
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<SettingDefinitionRecord>(SETTINGS_ENTITY_NAME);
  }

  private parseRecord(value: unknown): SettingDefinitionRecord {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return SettingDefinitionRecordSchema.parse(value);
    }

    const normalized = { ...(value as Record<string, unknown>) };
    if (normalized.category === null) delete normalized.category;
    if (normalized.description === null) delete normalized.description;
    if (normalized.visibility === null) delete normalized.visibility;
    if (normalized.mutable === null) delete normalized.mutable;
    if (normalized.secret === null) delete normalized.secret;
    if (normalized.status === null) delete normalized.status;

    return SettingDefinitionRecordSchema.parse(normalized);
  }
}
