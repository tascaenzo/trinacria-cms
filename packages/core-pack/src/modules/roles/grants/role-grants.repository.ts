import {
  createPluginDbScope,
  type DbAdapter,
  type PluginDbScope,
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import {
  EmbeddedRoleGrantSchema,
  RoleGrantRecordSchema,
  type RoleGrantRecord,
} from "./role-grants.schemas.js";

const ROLES_ENTITY_NAME = "roles";

interface RoleDocument {
  id: string;
  code: string;
  permissionGrants: Array<{
    permissionKey: string;
    sourcePluginId: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface UpsertRoleGrantInput {
  roleCode: string;
  permissionKey: string;
  sourcePluginId: string;
}

/**
 * Persistence adapter for role grants backed by embedded arrays in `roles`.
 * No separate join collection is used.
 */
export class RoleGrantsRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async upsert(input: UpsertRoleGrantInput): Promise<RoleGrantRecord> {
    const normalizedRoleCode = input.roleCode.trim().toLowerCase();
    const normalizedPermissionKey = input.permissionKey.trim().toLowerCase();
    const normalizedSourcePluginId = input.sourcePluginId.trim().toLowerCase();

    const role = await this.findRoleByCode(normalizedRoleCode);
    if (!role) {
      throw new Error(`Role "${normalizedRoleCode}" not found`);
    }

    const existing = role.permissionGrants.find(
      (grant) =>
        grant.permissionKey === normalizedPermissionKey &&
        grant.sourcePluginId === normalizedSourcePluginId,
    );
    if (existing) return this.toRecord(role.code, existing);

    const now = new Date().toISOString();
    const createdGrant = EmbeddedRoleGrantSchema.parse({
      permissionKey: normalizedPermissionKey,
      sourcePluginId: normalizedSourcePluginId,
      createdAt: now,
      updatedAt: now,
    });
    const nextGrants = [...role.permissionGrants, createdGrant];

    await this.repository().updateOne(
      { filter: { id: role.id } },
      {
        permissionGrants: nextGrants,
        permissions: this.toPermissionKeys(nextGrants),
        updatedAt: now,
      },
    );

    return this.toRecord(role.code, createdGrant);
  }

  async findOne(
    input: UpsertRoleGrantInput,
  ): Promise<RoleGrantRecord | null> {
    const normalizedRoleCode = input.roleCode.trim().toLowerCase();
    const normalizedPermissionKey = input.permissionKey.trim().toLowerCase();
    const normalizedSourcePluginId = input.sourcePluginId.trim().toLowerCase();
    const records = await this.listByRoleCode(normalizedRoleCode);
    return (
      records.find(
        (record) =>
          record.permissionKey === normalizedPermissionKey &&
          record.sourcePluginId === normalizedSourcePluginId,
      ) ?? null
    );
  }

  async listByRoleCode(roleCode: string): Promise<readonly RoleGrantRecord[]> {
    const role = await this.findRoleByCode(roleCode.trim().toLowerCase());
    if (!role) return [];
    return role.permissionGrants.map((grant) => this.toRecord(role.code, grant));
  }

  async listByRoleCodes(
    roleCodes: readonly string[],
  ): Promise<readonly RoleGrantRecord[]> {
    const targetCodes = new Set(
      roleCodes.map((roleCode) => roleCode.trim().toLowerCase()),
    );
    if (targetCodes.size === 0) return [];

    const roles = await this.listAllRoles();
    return roles
      .filter((role) => targetCodes.has(role.code))
      .flatMap((role) =>
        role.permissionGrants.map((grant) => this.toRecord(role.code, grant)),
      );
  }

  async listBySourcePlugin(
    sourcePluginId: string,
  ): Promise<readonly RoleGrantRecord[]> {
    const normalizedSource = sourcePluginId.trim().toLowerCase();
    const roles = await this.listAllRoles();
    return roles.flatMap((role) =>
      role.permissionGrants
        .filter((grant) => grant.sourcePluginId === normalizedSource)
        .map((grant) => this.toRecord(role.code, grant)),
    );
  }

  async deleteById(id: string): Promise<boolean> {
    const roles = await this.listAllRoles();
    const target = roles.find((role) =>
      role.permissionGrants.some((grant) => this.buildGrantId(role.code, grant) === id),
    );
    if (!target) return false;

    const nextGrants = target.permissionGrants.filter(
      (grant) => this.buildGrantId(target.code, grant) !== id,
    );
    if (nextGrants.length === target.permissionGrants.length) return false;

    const now = new Date().toISOString();
    await this.repository().updateOne(
      { filter: { id: target.id } },
      {
        permissionGrants: nextGrants,
        permissions: this.toPermissionKeys(nextGrants),
        updatedAt: now,
      },
    );
    return true;
  }

  async deleteBySourcePlugin(sourcePluginId: string): Promise<number> {
    const records = await this.listBySourcePlugin(sourcePluginId);
    let deleted = 0;
    for (const record of records) {
      const outcome = await this.deleteById(record.id);
      if (outcome) deleted += 1;
    }
    return deleted;
  }

  async deleteByRoleCode(roleCode: string): Promise<number> {
    const role = await this.findRoleByCode(roleCode.trim().toLowerCase());
    if (!role) return 0;
    const deleted = role.permissionGrants.length;
    if (deleted === 0) return 0;

    const now = new Date().toISOString();
    await this.repository().updateOne(
      { filter: { id: role.id } },
      { permissionGrants: [], permissions: [], updatedAt: now },
    );
    return deleted;
  }

  async hasGrantFromOtherPlugins(
    roleCode: string,
    excludedPluginId: string,
  ): Promise<boolean> {
    const records = await this.listByRoleCode(roleCode);
    const normalizedExcluded = excludedPluginId.trim().toLowerCase();
    return records.some((record) => record.sourcePluginId !== normalizedExcluded);
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<Record<string, unknown>>(ROLES_ENTITY_NAME);
  }

  private async findRoleByCode(code: string): Promise<RoleDocument | null> {
    const raw = await this.repository().findOne({
      filter: { code: code.trim().toLowerCase() },
    });
    if (!raw) return null;
    return this.parseRoleDocument(raw);
  }

  private async listAllRoles(): Promise<readonly RoleDocument[]> {
    const rawRoles = await this.repository().findMany({});
    return rawRoles.map((role) => this.parseRoleDocument(role));
  }

  private parseRoleDocument(value: unknown): RoleDocument {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Invalid role document shape");
    }

    const record = value as Record<string, unknown>;
    const id = String(record.id ?? "");
    const code = String(record.code ?? "").trim().toLowerCase();
    if (!id || !code) {
      throw new Error("Invalid role document: missing id/code");
    }

    const permissionGrantsRaw = Array.isArray(record.permissionGrants)
      ? record.permissionGrants
      : [];
    const permissionGrants = permissionGrantsRaw.map((item) =>
      EmbeddedRoleGrantSchema.parse(item),
    );

    return { id, code, permissionGrants };
  }

  private toRecord(
    roleCode: string,
    grant: RoleDocument["permissionGrants"][number],
  ): RoleGrantRecord {
    return RoleGrantRecordSchema.parse({
      id: this.buildGrantId(roleCode, grant),
      roleCode,
      permissionKey: grant.permissionKey,
      sourcePluginId: grant.sourcePluginId,
      createdAt: grant.createdAt,
      updatedAt: grant.updatedAt,
    });
  }

  private buildGrantId(
    roleCode: string,
    grant: RoleDocument["permissionGrants"][number],
  ): string {
    return `${encodeURIComponent(roleCode)}::${encodeURIComponent(
      grant.permissionKey,
    )}::${encodeURIComponent(grant.sourcePluginId)}`;
  }

  private toPermissionKeys(
    grants: readonly RoleDocument["permissionGrants"][number][],
  ): readonly string[] {
    return [...new Set(grants.map((grant) => grant.permissionKey))];
  }
}
