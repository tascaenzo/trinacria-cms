import type {
  CreateRoleInput,
  UpdateRoleInput,
  UpdateRoleStatusInput
} from "../dto/roles.input.dto.js";
import { type RoleRecord } from "../roles.schemas.js";
import { RoleGrantsRepository } from "../grants/role-grants.repository.js";
import { RolesRepository } from "../repositories/roles.repository.js";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";

/**
 * Application service for role lifecycle operations.
 */
export class RolesService {
  constructor(
    private readonly repository: RolesRepository,
    private readonly grants: RoleGrantsRepository
  ) {}

  async createRole(input: CreateRoleInput): Promise<RoleRecord> {
    const existing = await this.repository.findByCode(input.code);
    if (existing) {
      throw new Error(`Role with code "${input.code}" already exists`);
    }
    const created = await this.repository.create(input);
    for (const permissionKey of input.permissions ?? []) {
      await this.grants.upsert({
        roleCode: created.code,
        permissionKey,
        sourcePluginId: CORE_PACK_PLUGIN_ID
      });
    }
    return this.hydrateRolePermissions(created);
  }

  async getRoleById(id: string): Promise<RoleRecord | null> {
    const role = await this.repository.findById(id);
    if (!role) return null;
    return this.hydrateRolePermissions(role);
  }

  async listRoles(options?: { limit?: number; offset?: number }): Promise<readonly RoleRecord[]> {
    const roles = await this.repository.list({
      limit: options?.limit,
      offset: options?.offset
    });
    return this.hydrateManyRolePermissions(roles);
  }

  async disableRole(id: string): Promise<RoleRecord | null> {
    return this.setRoleStatus(id, { status: "disabled" });
  }

  async activateRole(id: string): Promise<RoleRecord | null> {
    return this.setRoleStatus(id, { status: "active" });
  }

  async updateRole(id: string, input: UpdateRoleInput): Promise<RoleRecord | null> {
    const updated = await this.repository.updateDetails(id, input);
    if (!updated) return null;

    if (input.permissions) {
      await this.grants.deleteByRoleCode(updated.code);
      for (const permissionKey of input.permissions) {
        await this.grants.upsert({
          roleCode: updated.code,
          permissionKey,
          sourcePluginId: CORE_PACK_PLUGIN_ID
        });
      }
    }

    const refreshed = await this.repository.findById(updated.id);
    return refreshed ? this.hydrateRolePermissions(refreshed) : null;
  }

  private setRoleStatus(id: string, input: UpdateRoleStatusInput): Promise<RoleRecord | null> {
    return this.repository.updateStatus(id, input).then((role) => {
      if (!role) return null;
      return this.hydrateRolePermissions(role);
    });
  }

  private async hydrateManyRolePermissions(
    roles: readonly RoleRecord[]
  ): Promise<readonly RoleRecord[]> {
    const grants = await this.grants.listByRoleCodes(roles.map((role) => role.code));
    const permissionMap = new Map<string, string[]>();

    for (const grant of grants) {
      const current = permissionMap.get(grant.roleCode) ?? [];
      if (!current.includes(grant.permissionKey)) {
        current.push(grant.permissionKey);
      }
      permissionMap.set(grant.roleCode, current);
    }

    return roles.map((role) => ({
      ...role,
      permissions: permissionMap.get(role.code) ?? []
    }));
  }

  private async hydrateRolePermissions(role: RoleRecord): Promise<RoleRecord> {
    const grants = await this.grants.listByRoleCode(role.code);
    const permissions = Array.from(new Set(grants.map((grant) => grant.permissionKey)));
    return {
      ...role,
      permissions
    };
  }
}
