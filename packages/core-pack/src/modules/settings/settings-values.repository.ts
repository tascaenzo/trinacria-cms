import {
  createPluginDbScope,
  type DbAdapter,
  type PluginDbScope,
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import {
  SettingValueRecordSchema,
  type SettingValueRecord,
} from "./settings.schemas.js";

const SETTINGS_VALUES_ENTITY_NAME = "settings_values";

export interface UpsertSettingValueRecordInput {
  key: string;
  ownerPluginId: string;
  valueJson: string;
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
        key: normalizedKey,
        ownerPluginId: normalizedOwner,
        valueJson: input.valueJson,
        version: 1,
        ...(input.updatedBy?.trim() ? { updatedBy: input.updatedBy.trim() } : {}),
        createdAt: now,
        updatedAt: now,
      });
      return this.parseRecord(created);
    }

    if (existing.ownerPluginId !== normalizedOwner) {
      throw new Error(
        `Setting value "${normalizedKey}" is owned by plugin "${existing.ownerPluginId}"`,
      );
    }

    const updated = await this.repository().updateOne(
      { filter: { id: existing.id } },
      {
        valueJson: input.valueJson,
        version: existing.version + 1,
        ...(input.updatedBy?.trim() ? { updatedBy: input.updatedBy.trim() } : {}),
        updatedAt: now,
      },
    );

    if (!updated) {
      throw new Error(`Setting value "${normalizedKey}" disappeared during upsert`);
    }

    return this.parseRecord(updated);
  }

  async findByKey(key: string): Promise<SettingValueRecord | null> {
    return this.repository().findOne({
      filter: { key: key.trim().toLowerCase() },
      parse: (value: unknown) => this.parseRecord(value),
    });
  }

  async listByOwnerPlugin(ownerPluginId: string): Promise<readonly SettingValueRecord[]> {
    return this.repository().findMany({
      filter: { ownerPluginId: ownerPluginId.trim().toLowerCase() },
      sort: { createdAt: "asc" },
      parse: (value: unknown) => this.parseRecord(value),
    });
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<SettingValueRecord>(SETTINGS_VALUES_ENTITY_NAME);
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
