import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import { SettingValueRecordSchema, type SettingValueRecord } from "../schemas/settings.schemas.js";
import type { JsonValue } from "../_shared/settings-json.js";

const SETTINGS_ENTITY_NAME = "settings";
const VALUE_KIND = "value" as const;

export interface UpsertSettingValueRecordInput {
  key: string;
  ownerPluginId: string;
  value: JsonValue;
  updatedBy?: string;
}

/**
 * Persistence adapter for setting values.
 */
export class SettingsValuesRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async upsert(input: UpsertSettingValueRecordInput): Promise<SettingValueRecord> {
    const normalizedKey = input.key.trim().toLowerCase();
    const normalizedOwner = input.ownerPluginId.trim().toLowerCase();
    const existing = await this.findByKey(normalizedKey);
    const now = new Date().toISOString();

    if (!existing) {
      const created = await this.repository().insertOne({
        kind: VALUE_KIND,
        key: normalizedKey,
        ownerPluginId: normalizedOwner,
        value: input.value,
        version: 1,
        ...(input.updatedBy?.trim() ? { updatedBy: input.updatedBy.trim() } : {}),
        createdAt: now,
        updatedAt: now
      });
      return this.parseRecord(created);
    }

    if (existing.ownerPluginId !== normalizedOwner) {
      throw new Error(
        `Setting value "${normalizedKey}" is owned by plugin "${existing.ownerPluginId}"`
      );
    }

    const updated = await this.repository().updateOne(
      { filter: { id: existing.id } },
      {
        value: input.value,
        version: existing.version + 1,
        ...(input.updatedBy?.trim() ? { updatedBy: input.updatedBy.trim() } : {}),
        updatedAt: now
      }
    );

    if (!updated) {
      throw new Error(`Setting value "${normalizedKey}" disappeared during upsert`);
    }

    return this.parseRecord(updated);
  }

  async findByKey(key: string): Promise<SettingValueRecord | null> {
    return this.repository().findOne({
      filter: { key: key.trim().toLowerCase(), kind: VALUE_KIND },
      parse: (value: unknown) => this.parseRecord(value)
    });
  }

  async deleteByKey(key: string): Promise<boolean> {
    return this.repository().deleteOne({
      filter: { key: key.trim().toLowerCase(), kind: VALUE_KIND }
    });
  }

  async listByOwnerPlugin(ownerPluginId: string): Promise<readonly SettingValueRecord[]> {
    return this.repository().findMany({
      filter: {
        ownerPluginId: ownerPluginId.trim().toLowerCase(),
        kind: VALUE_KIND
      },
      sort: { createdAt: "asc" },
      parse: (value: unknown) => this.parseRecord(value)
    });
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<SettingValueRecord>(SETTINGS_ENTITY_NAME);
  }

  private parseRecord(value: unknown): SettingValueRecord {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return SettingValueRecordSchema.parse(value);
    }

    const normalized = { ...(value as Record<string, unknown>) };
    if (normalized.updatedBy === null) delete normalized.updatedBy;

    return SettingValueRecordSchema.parse(normalized);
  }
}
