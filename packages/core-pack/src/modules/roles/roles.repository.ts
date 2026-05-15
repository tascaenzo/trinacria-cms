import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import {
  CreateRoleInputSchema,
  type CreateRoleInput,
  type UpdateRoleStatusInput,
  UpdateRoleStatusInputSchema
} from "./dto/roles.input.dto.js";
import { RoleRecordSchema, type RoleRecord } from "./roles.schemas.js";

const ROLES_ENTITY_NAME = "roles";

/**
 * Persistence adapter for roles module over kernel DbAdapter.
 */
export class RolesRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async create(input: CreateRoleInput): Promise<RoleRecord> {
    const parsedInput = CreateRoleInputSchema.parse(input);

    const now = new Date().toISOString();
    const record = {
      code: parsedInput.code,
      name: parsedInput.name,
      ...(parsedInput.description ? { description: parsedInput.description } : {}),
      ownerPluginId: CORE_PACK_PLUGIN_ID,
      status: "active" as const,
      createdAt: now,
      updatedAt: now
    };

    const created = await this.repository().insertOne(record);
    return this.parseRoleRecord(created);
  }

  async findById(id: string): Promise<RoleRecord | null> {
    const found = await this.repository().findOne({
      filter: { id },
      parse: (value: unknown) => this.parseRoleRecord(value)
    });
    return found;
  }

  async findByCode(code: string): Promise<RoleRecord | null> {
    const normalizedCode = code.trim().toLowerCase();
    const found = await this.repository().findOne({
      filter: { code: normalizedCode },
      parse: (value: unknown) => this.parseRoleRecord(value)
    });
    return found;
  }

  async list(options?: { limit?: number; offset?: number }): Promise<readonly RoleRecord[]> {
    const roles = await this.repository().findMany({
      limit: options?.limit,
      offset: options?.offset,
      sort: { createdAt: "desc" },
      parse: (value: unknown) => this.parseRoleRecord(value)
    });
    return roles;
  }

  async listOwnedByPlugin(pluginId: string): Promise<readonly RoleRecord[]> {
    const roles = await this.repository().findMany({
      filter: { ownerPluginId: pluginId.trim().toLowerCase() },
      sort: { createdAt: "desc" },
      parse: (value: unknown) => this.parseRoleRecord(value)
    });
    return roles;
  }

  async updateStatus(id: string, input: UpdateRoleStatusInput): Promise<RoleRecord | null> {
    const parsedInput = UpdateRoleStatusInputSchema.parse(input);
    const updated = await this.repository().updateOne(
      { filter: { id } },
      {
        status: parsedInput.status,
        updatedAt: new Date().toISOString()
      }
    );

    if (!updated) return null;
    return this.parseRoleRecord(updated);
  }

  async upsertOwnedRole(input: {
    code: string;
    name: string;
    description?: string;
    ownerPluginId: string;
  }): Promise<RoleRecord> {
    const normalizedCode = input.code.trim().toLowerCase();
    const normalizedOwner = input.ownerPluginId.trim().toLowerCase();
    const existing = await this.findByCode(normalizedCode);

    if (existing && existing.ownerPluginId && existing.ownerPluginId !== normalizedOwner) {
      throw new Error(`Role "${normalizedCode}" is owned by plugin "${existing.ownerPluginId}"`);
    }

    if (!existing) {
      const now = new Date().toISOString();
      const created = await this.repository().insertOne({
        code: normalizedCode,
        name: input.name.trim(),
        ...(input.description?.trim() ? { description: input.description.trim() } : {}),
        ownerPluginId: normalizedOwner,
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      });
      return this.parseRoleRecord(created);
    }

    const updated = await this.repository().updateOne(
      { filter: { id: existing.id } },
      {
        name: input.name.trim(),
        ...(input.description?.trim() ? { description: input.description.trim() } : {}),
        ownerPluginId: normalizedOwner,
        updatedAt: new Date().toISOString()
      }
    );

    if (!updated) {
      throw new Error(`Role "${normalizedCode}" disappeared during upsert`);
    }
    return this.parseRoleRecord(updated);
  }

  async deleteById(id: string): Promise<boolean> {
    return this.repository().deleteOne({ filter: { id } });
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<RoleRecord>(ROLES_ENTITY_NAME);
  }

  private parseRoleRecord(value: unknown): RoleRecord {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return RoleRecordSchema.parse(value);
    }

    const normalized = { ...(value as Record<string, unknown>) };
    if (normalized.description === null) {
      delete normalized.description;
    }
    if (normalized.permissions === null) {
      delete normalized.permissions;
    }
    // Internal embedded grants must not leak into API RoleRecord shape.
    if ("permissionGrants" in normalized) {
      delete normalized.permissionGrants;
    }
    if (normalized.ownerPluginId === null) {
      delete normalized.ownerPluginId;
    }

    return RoleRecordSchema.parse(normalized);
  }
}
