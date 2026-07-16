import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import {
  SettingSecretRecordSchema,
  type SettingSecretRecord
} from "../schemas/settings.schemas.js";

const SETTINGS_ENTITY_NAME = "settings";
const SECRET_KIND = "secret" as const;

export interface UpsertSettingSecretRecordInput {
  key: string;
  ownerPluginId: string;
  cipherText: string;
  iv: string;
  authTag: string;
  algorithm: "aes-256-gcm";
  keyVersion: string;
  updatedBy?: string;
}

/**
 * Persistence adapter for encrypted setting secrets.
 */
export class SettingsSecretsRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async upsert(input: UpsertSettingSecretRecordInput): Promise<SettingSecretRecord> {
    const normalizedKey = input.key.trim().toLowerCase();
    const normalizedOwner = input.ownerPluginId.trim().toLowerCase();
    const existing = await this.findByKey(normalizedKey);
    const now = new Date().toISOString();

    if (!existing) {
      const created = await this.repository().insertOne({
        kind: SECRET_KIND,
        key: normalizedKey,
        ownerPluginId: normalizedOwner,
        cipherText: input.cipherText,
        iv: input.iv,
        authTag: input.authTag,
        algorithm: input.algorithm,
        keyVersion: input.keyVersion,
        ...(input.updatedBy?.trim() ? { updatedBy: input.updatedBy.trim() } : {}),
        createdAt: now,
        updatedAt: now
      });
      return this.parseRecord(created);
    }

    if (existing.ownerPluginId !== normalizedOwner) {
      throw new Error(
        `Setting secret "${normalizedKey}" is owned by plugin "${existing.ownerPluginId}"`
      );
    }

    const updated = await this.repository().updateOne(
      { filter: { id: existing.id } },
      {
        cipherText: input.cipherText,
        iv: input.iv,
        authTag: input.authTag,
        algorithm: input.algorithm,
        keyVersion: input.keyVersion,
        ...(input.updatedBy?.trim() ? { updatedBy: input.updatedBy.trim() } : {}),
        updatedAt: now
      }
    );

    if (!updated) {
      throw new Error(`Setting secret "${normalizedKey}" disappeared during upsert`);
    }

    return this.parseRecord(updated);
  }

  async findByKey(key: string): Promise<SettingSecretRecord | null> {
    return this.repository().findOne({
      filter: { key: key.trim().toLowerCase(), kind: SECRET_KIND },
      parse: (value: unknown) => this.parseRecord(value)
    });
  }

  async deleteByKey(key: string): Promise<boolean> {
    return this.repository().deleteOne({
      filter: { key: key.trim().toLowerCase(), kind: SECRET_KIND }
    });
  }

  async listByOwnerPlugin(ownerPluginId: string): Promise<readonly SettingSecretRecord[]> {
    return this.repository().findMany({
      filter: {
        ownerPluginId: ownerPluginId.trim().toLowerCase(),
        kind: SECRET_KIND
      },
      sort: { createdAt: "asc" },
      parse: (value: unknown) => this.parseRecord(value)
    });
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<SettingSecretRecord>(SETTINGS_ENTITY_NAME);
  }

  private parseRecord(value: unknown): SettingSecretRecord {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return SettingSecretRecordSchema.parse(value);
    }

    const normalized = { ...(value as Record<string, unknown>) };
    if (normalized.updatedBy === null) delete normalized.updatedBy;

    return SettingSecretRecordSchema.parse(normalized);
  }
}
