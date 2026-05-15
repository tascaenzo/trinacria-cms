import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import { ApiKeyRecordSchema, type ApiKeyRecord } from "./api-keys.schemas.js";

const API_KEYS_ENTITY_NAME = "api_keys";

/**
 * Persistence adapter for API key records.
 */
export class ApiKeysRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async create(input: Omit<ApiKeyRecord, "id">): Promise<ApiKeyRecord> {
    const created = await this.repository().insertOne(input);
    return this.parseRecord(created);
  }

  async findById(id: string): Promise<ApiKeyRecord | null> {
    return this.repository().findOne({
      filter: { id: id.trim() },
      parse: (value: unknown) => this.parseRecord(value)
    });
  }

  async findByLookupId(lookupId: string): Promise<ApiKeyRecord | null> {
    return this.repository().findOne({
      filter: { lookupId: lookupId.trim().toLowerCase() },
      parse: (value: unknown) => this.parseRecord(value)
    });
  }

  async list(options?: {
    kind?: ApiKeyRecord["kind"];
    status?: ApiKeyRecord["status"];
    limit?: number;
    offset?: number;
  }): Promise<readonly ApiKeyRecord[]> {
    const filter: Record<string, unknown> = {};
    if (options?.kind) {
      filter.kind = options.kind;
    }
    if (options?.status) {
      filter.status = options.status;
    }

    return this.repository().findMany({
      filter,
      limit: options?.limit,
      offset: options?.offset,
      sort: { createdAt: "desc" },
      parse: (value: unknown) => this.parseRecord(value)
    });
  }

  async updateById(
    id: string,
    patch: Partial<Omit<ApiKeyRecord, "id">>
  ): Promise<ApiKeyRecord | null> {
    const updated = await this.repository().updateOne({ filter: { id: id.trim() } }, patch);
    if (!updated) return null;
    return this.parseRecord(updated);
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<ApiKeyRecord>(API_KEYS_ENTITY_NAME);
  }

  private parseRecord(value: unknown): ApiKeyRecord {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return ApiKeyRecordSchema.parse(value);
    }

    const normalized = { ...(value as Record<string, unknown>) };
    for (const key of ["description", "lastUsedAt", "expiresAt", "revokedAt"] as const) {
      if (normalized[key] === null) {
        delete normalized[key];
      }
    }

    return ApiKeyRecordSchema.parse(normalized);
  }
}
