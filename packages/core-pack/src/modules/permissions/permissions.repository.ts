import {
  createPluginDbScope,
  isValidPermissionKey,
  type DbAdapter,
  type PluginDbScope
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import {
  CreatePermissionInputSchema,
  type CreatePermissionInput,
  type UpdatePermissionStatusInput,
  UpdatePermissionStatusInputSchema
} from "./dto/permissions.input.dto.js";
import { PermissionRecordSchema, type PermissionRecord } from "./permissions.schemas.js";

const PERMISSIONS_ENTITY_NAME = "permissions";

/**
 * Persistence adapter for permissions module over kernel DbAdapter.
 */
export class PermissionsRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async create(input: CreatePermissionInput): Promise<PermissionRecord> {
    const parsedInput = CreatePermissionInputSchema.parse(input);

    const now = new Date().toISOString();
    const record = {
      key: parsedInput.key,
      displayName: parsedInput.displayName,
      ...(parsedInput.description ? { description: parsedInput.description } : {}),
      sourcePluginId: CORE_PACK_PLUGIN_ID,
      status: "active" as const,
      createdAt: now,
      updatedAt: now
    };

    const created = await this.repository().insertOne(record);
    return this.parsePermissionRecord(created);
  }

  async findById(id: string): Promise<PermissionRecord | null> {
    const found = await this.repository().findOne({
      filter: { id },
      parse: (value: unknown) => this.parsePermissionRecord(value)
    });
    return found;
  }

  async findByKey(key: string): Promise<PermissionRecord | null> {
    const normalizedKey = key.trim().toLowerCase();
    const found = await this.repository().findOne({
      filter: { key: normalizedKey },
      parse: (value: unknown) => this.parsePermissionRecord(value)
    });
    return found;
  }

  async list(options?: { limit?: number; offset?: number }): Promise<readonly PermissionRecord[]> {
    const permissions = await this.repository().findMany({
      limit: options?.limit,
      offset: options?.offset,
      sort: { createdAt: "desc" },
      parse: (value: unknown) => this.parsePermissionRecord(value)
    });
    return permissions;
  }

  async listBySourcePlugin(sourcePluginId: string): Promise<readonly PermissionRecord[]> {
    const permissions = await this.repository().findMany({
      filter: {
        sourcePluginId: sourcePluginId.trim().toLowerCase()
      },
      sort: { createdAt: "desc" },
      parse: (value: unknown) => this.parsePermissionRecord(value)
    });
    return permissions;
  }

  async updateStatus(
    id: string,
    input: UpdatePermissionStatusInput
  ): Promise<PermissionRecord | null> {
    const parsedInput = UpdatePermissionStatusInputSchema.parse(input);
    const updated = await this.repository().updateOne(
      { filter: { id } },
      {
        status: parsedInput.status,
        updatedAt: new Date().toISOString()
      }
    );

    if (!updated) return null;
    return this.parsePermissionRecord(updated);
  }

  async upsertOwnedPermission(input: {
    key: string;
    displayName: string;
    description?: string;
    sourcePluginId: string;
  }): Promise<PermissionRecord> {
    const normalizedKey = input.key.trim().toLowerCase();
    const normalizedOwner = input.sourcePluginId.trim().toLowerCase();
    const existing = await this.findByKey(normalizedKey);

    if (existing && existing.sourcePluginId && existing.sourcePluginId !== normalizedOwner) {
      throw new Error(
        `Permission "${normalizedKey}" is owned by plugin "${existing.sourcePluginId}"`
      );
    }

    if (!existing) {
      const now = new Date().toISOString();
      const created = await this.repository().insertOne({
        key: normalizedKey,
        displayName: input.displayName.trim(),
        ...(input.description?.trim() ? { description: input.description.trim() } : {}),
        sourcePluginId: normalizedOwner,
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      });
      return this.parsePermissionRecord(created);
    }

    const updated = await this.repository().updateOne(
      { filter: { id: existing.id } },
      {
        displayName: input.displayName.trim(),
        ...(input.description?.trim() ? { description: input.description.trim() } : {}),
        sourcePluginId: normalizedOwner,
        updatedAt: new Date().toISOString()
      }
    );

    if (!updated) {
      throw new Error(`Permission "${normalizedKey}" disappeared during upsert`);
    }
    return this.parsePermissionRecord(updated);
  }

  async deleteById(id: string): Promise<boolean> {
    return this.repository().deleteOne({ filter: { id } });
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<PermissionRecord>(PERMISSIONS_ENTITY_NAME);
  }

  private parsePermissionRecord(value: unknown): PermissionRecord {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return PermissionRecordSchema.parse(value);
    }

    const normalized = { ...(value as Record<string, unknown>) };
    if (normalized.description === null) {
      delete normalized.description;
    }
    if (typeof normalized.key === "string") {
      normalized.key = this.normalizePermissionKey(normalized.key);
    }
    if (normalized.sourcePluginId === undefined || normalized.sourcePluginId === null) {
      normalized.sourcePluginId = CORE_PACK_PLUGIN_ID;
    }

    return PermissionRecordSchema.parse(normalized);
  }

  private normalizePermissionKey(value: string): string {
    const normalized = value.trim().toLowerCase();
    if (isValidPermissionKey(normalized)) {
      return normalized;
    }

    const segments = normalized.split(".");
    if (segments.length >= 2) {
      const action = segments.pop();
      const resource = segments.join(".");
      if (resource && action) {
        const canonical = `${CORE_PACK_PLUGIN_ID}:${resource}:${action}`;
        if (isValidPermissionKey(canonical)) {
          return canonical;
        }
      }
    }

    return normalized;
  }
}
