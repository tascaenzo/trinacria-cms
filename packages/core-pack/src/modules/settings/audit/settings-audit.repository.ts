import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import {
  SettingsAuditRecordSchema,
  type SettingsAuditRecord,
  type SettingAuditAction
} from "../schemas/settings-audit.schemas.js";

const SETTINGS_AUDIT_ENTITY_NAME = "settings_audit";

export interface CreateAuditRecordInput {
  key: string;
  action: SettingAuditAction;
  actor?: string;
  oldHash?: string;
  newMetadata?: {
    description?: string;
    category?: string;
    hadDefault?: boolean;
    hadValue?: boolean;
  };
}

/**
 * Append-only audit repository for setting changes.
 * Provides query capabilities for export but no update/delete.
 */
export class SettingsAuditRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async record(input: CreateAuditRecordInput): Promise<SettingsAuditRecord> {
    const now = new Date().toISOString();
    const created = await this.repository().insertOne({
      key: input.key.trim().toLowerCase(),
      action: input.action,
      ...(input.actor?.trim() ? { actor: input.actor.trim() } : {}),
      ...(input.oldHash ? { oldHash: input.oldHash } : {}),
      ...(input.newMetadata ? { newMetadata: input.newMetadata } : {}),
      createdAt: now
    });
    return this.parseRecord(created);
  }

  async findByKey(key: string, options?: { limit?: number }): Promise<readonly SettingsAuditRecord[]> {
    return this.repository().findMany({
      filter: { key: key.trim().toLowerCase() },
      sort: { createdAt: "desc" },
      limit: options?.limit,
      parse: (value: unknown) => this.parseRecord(value)
    });
  }

  async findByAction(action: SettingAuditAction, options?: { limit?: number }): Promise<readonly SettingsAuditRecord[]> {
    return this.repository().findMany({
      filter: { action },
      sort: { createdAt: "desc" },
      limit: options?.limit,
      parse: (value: unknown) => this.parseRecord(value)
    });
  }

  async list(options?: { limit?: number; offset?: number }): Promise<readonly SettingsAuditRecord[]> {
    return this.repository().findMany({
      filter: {},
      sort: { createdAt: "desc" },
      limit: options?.limit,
      offset: options?.offset,
      parse: (value: unknown) => this.parseRecord(value)
    });
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<SettingsAuditRecord>(SETTINGS_AUDIT_ENTITY_NAME);
  }

  private parseRecord(value: unknown): SettingsAuditRecord {
    return SettingsAuditRecordSchema.parse(value);
  }
}
