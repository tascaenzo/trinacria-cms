import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import type { CacheService } from "../../cache/services/cache.service.js";
import {
  CreateRoleInputSchema,
  type CreateRoleInput,
  type UpdateRoleInput,
  UpdateRoleInputSchema,
  type UpdateRoleStatusInput,
  UpdateRoleStatusInputSchema
} from "../dto/roles.input.dto.js";
import { RoleRecordSchema, type RoleRecord } from "../roles.schemas.js";

const ROLES_ENTITY_NAME = "roles";
const CACHE_NAMESPACE = "roles";

/**
 * Persistence adapter for roles module over kernel DbAdapter.
 */
export class RolesRepository {
  private scope?: PluginDbScope;

  constructor(
    private readonly db: DbAdapter,
    private readonly cache?: CacheService
  ) {}

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
    await this.cache?.invalidate(CACHE_NAMESPACE);
    return this.parseRoleRecord(created);
  }

  async findById(id: string): Promise<RoleRecord | null> {
    if (!this.cache) {
      return this.findByIdFromDb(id);
    }
    return this.cache.getOrCompute(CACHE_NAMESPACE, `id:${id}`, () => this.findByIdFromDb(id));
  }

  private async findByIdFromDb(id: string): Promise<RoleRecord | null> {
    return this.repository().findOne({
      filter: { id },
      parse: (value: unknown) => this.parseRoleRecord(value)
    });
  }

  async findByCode(code: string): Promise<RoleRecord | null> {
    const normalizedCode = code.trim().toLowerCase();
    if (!this.cache) {
      return this.findByCodeFromDb(normalizedCode);
    }
    return this.cache.getOrCompute(CACHE_NAMESPACE, `code:${normalizedCode}`, () =>
      this.findByCodeFromDb(normalizedCode)
    );
  }

  private async findByCodeFromDb(code: string): Promise<RoleRecord | null> {
    return this.repository().findOne({
      filter: { code },
      parse: (value: unknown) => this.parseRoleRecord(value)
    });
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

  async listByCodes(codes: readonly string[]): Promise<readonly RoleRecord[]> {
    if (codes.length === 0) return [];
    const normalized = codes.map((c) => c.trim().toLowerCase());
    const roles = await this.repository().findMany({
      filter: { code: { $in: normalized } },
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
    await this.cache?.invalidate(CACHE_NAMESPACE);
    return this.parseRoleRecord(updated);
  }

  async updateDetails(id: string, input: UpdateRoleInput): Promise<RoleRecord | null> {
    const parsedInput = UpdateRoleInputSchema.parse(input);
    const patch: Partial<RoleRecord> = {
      name: parsedInput.name,
      updatedAt: new Date().toISOString()
    };
    if (parsedInput.status) {
      patch.status = parsedInput.status;
    }
    if (parsedInput.description?.trim()) {
      patch.description = parsedInput.description;
    } else {
      patch.description = undefined;
    }

    const updated = await this.repository().updateOne({ filter: { id: id.trim() } }, patch);

    if (!updated) return null;
    await this.cache?.invalidate(CACHE_NAMESPACE);
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
      await this.cache?.invalidate(CACHE_NAMESPACE);
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
    await this.cache?.invalidate(CACHE_NAMESPACE);
    return this.parseRoleRecord(updated);
  }

  async deleteById(id: string): Promise<boolean> {
    const deleted = await this.repository().deleteOne({ filter: { id } });
    if (deleted) {
      await this.cache?.invalidate(CACHE_NAMESPACE);
    }
    return deleted;
  }

  /**
   * Low-level update used by the provisioning service for embedded array operations.
   */
  async findRawById(id: string): Promise<Record<string, unknown> | null> {
    return this.repository().findOne({ filter: { id: id.trim() } });
  }

  async rawUpdate(id: string, patch: Record<string, unknown>): Promise<void> {
    await this.repository().updateOne({ filter: { id } }, patch as Partial<RoleRecord>);
    await this.cache?.invalidate(CACHE_NAMESPACE);
  }

  async rawCompareAndSwap(
    id: string,
    expectedUpdatedAt: string,
    patch: Record<string, unknown>
  ): Promise<boolean> {
    const updated = await this.repository().updateOne(
      { filter: { id, updatedAt: expectedUpdatedAt } },
      patch as Partial<RoleRecord>
    );
    if (!updated) return false;
    await this.cache?.invalidate(CACHE_NAMESPACE);
    return true;
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
    // Internal embedded arrays must not leak into API RoleRecord shape.
    if ("permissionGrants" in normalized) {
      delete normalized.permissionGrants;
    }
    if ("policyRules" in normalized) {
      delete normalized.policyRules;
    }
    if (normalized.ownerPluginId === null) {
      delete normalized.ownerPluginId;
    }

    return RoleRecordSchema.parse(normalized);
  }
}
