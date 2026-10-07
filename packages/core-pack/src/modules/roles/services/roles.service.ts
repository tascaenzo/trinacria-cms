import { CoreError } from "@trinacria-cms/kernel";
import { CORE_PACK_MANUAL_POLICY_SOURCE } from "../../../plugin/core-pack.constants.js";
import { PermissionsRepository } from "../../permissions/repositories/permissions.repository.js";
import type {
  CreateRoleInput,
  UpdateRoleInput,
  UpdateRoleStatusInput
} from "../dto/roles.input.dto.js";
import type { RoleGrantsRepository } from "../grants/role-grants.repository.js";
import type { RolesRepository } from "../repositories/roles.repository.js";
import type { RoleRecord } from "../roles.schemas.js";

/**
 * Application service for role lifecycle operations.
 */
export class RolesService {
  constructor(
    private readonly repository: RolesRepository,
    private readonly grants: RoleGrantsRepository,
    private readonly atomic?: <T>(work: (service: RolesService) => Promise<T>) => Promise<T>
  ) {}

  async createRole(input: CreateRoleInput): Promise<RoleRecord> {
    if (this.atomic) return this.atomic((service) => service.createRole(input));
    await this.validatePermissions(input.permissions ?? []);
    const existing = await this.repository.findByCode(input.code);
    if (existing) {
      throw new CoreError("conflict", `Role with code "${input.code}" already exists`);
    }
    const created = await this.repository.create(input);
    if (input.permissions?.length) {
      await this.replacePermissions(created, input.permissions, created.updatedAt);
    }
    return this.hydrateRolePermissions((await this.repository.findById(created.id)) ?? created);
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

  async disableRole(id: string, expectedUpdatedAt?: string): Promise<RoleRecord | null> {
    return this.setRoleStatus(id, {
      status: "disabled",
      expectedUpdatedAt:
        expectedUpdatedAt ??
        (await this.repository.findById(id))?.updatedAt ??
        new Date().toISOString()
    });
  }

  async activateRole(id: string, expectedUpdatedAt?: string): Promise<RoleRecord | null> {
    return this.setRoleStatus(id, {
      status: "active",
      expectedUpdatedAt:
        expectedUpdatedAt ??
        (await this.repository.findById(id))?.updatedAt ??
        new Date().toISOString()
    });
  }

  async updateRole(id: string, input: UpdateRoleInput): Promise<RoleRecord | null> {
    if (this.atomic) return this.atomic((service) => service.updateRole(id, input));
    const role = await this.repository.findById(id);
    if (!role) return null;
    if (role.code === "admin" && (input.status === "disabled" || input.permissions !== undefined)) {
      throw new CoreError(
        "iam_protected_role",
        "Administrator status and permissions are managed by the platform"
      );
    }
    await this.replacePermissions(role, input.permissions, input.expectedUpdatedAt, input);
    const refreshed = await this.repository.findById(id);
    return refreshed ? this.hydrateRolePermissions(refreshed) : null;
  }

  private async setRoleStatus(
    id: string,
    input: UpdateRoleStatusInput
  ): Promise<RoleRecord | null> {
    if (this.atomic) return this.atomic((service) => service.setRoleStatus(id, input));
    const role = await this.repository.findById(id);
    if (!role) return null;
    if (role.code === "admin" && input.status === "disabled") {
      throw new CoreError("iam_protected_role", "Administrator role cannot be disabled");
    }
    await this.replacePermissions(role, undefined, input.expectedUpdatedAt, {
      status: input.status
    });
    const refreshed = await this.repository.findById(id);
    return refreshed ? this.hydrateRolePermissions(refreshed) : null;
  }

  private async validatePermissions(keys: readonly string[]) {
    const permissions = new PermissionsRepository(this.repository.getAdapter());
    for (const key of keys) {
      if ((await permissions.findByKey(key))?.status !== "active") {
        throw new CoreError("invalid_request", `Permission "${key}" is missing or disabled`);
      }
    }
  }

  private async replacePermissions(
    role: RoleRecord,
    keys: readonly string[] | undefined,
    expectedUpdatedAt: string,
    metadata?: { name?: string; description?: string; status?: "active" | "disabled" }
  ) {
    const raw = await this.repository.findRawById(role.id);
    if (!raw || raw.updatedAt !== expectedUpdatedAt)
      throw new CoreError("iam_revision_conflict", "Role changed; reload before saving");
    const patch: Record<string, unknown> = {
      ...(metadata?.name !== undefined ? { name: metadata.name } : {}),
      ...(metadata?.description !== undefined
        ? { description: metadata.description.trim() || null }
        : {}),
      ...(metadata?.status !== undefined ? { status: metadata.status } : {}),
      updatedAt: new Date(Math.max(Date.now(), Date.parse(expectedUpdatedAt) + 1)).toISOString()
    };
    if (keys !== undefined) {
      await this.validatePermissions(keys);
      const now = String(patch.updatedAt);
      const grants = (Array.isArray(raw.permissionGrants) ? raw.permissionGrants : []) as Array<{
        permissionKey: string;
        sourcePluginId: string;
        createdAt: string;
        updatedAt: string;
      }>;
      const base = grants.filter(
        (grant) => grant.sourcePluginId !== CORE_PACK_MANUAL_POLICY_SOURCE
      );
      const desired = new Set(keys);
      const baseKeys = new Set(base.map((grant) => grant.permissionKey));
      patch.permissionGrants = [
        ...base,
        ...keys
          .filter((key) => !baseKeys.has(key))
          .map((permissionKey) => ({
            permissionKey,
            sourcePluginId: CORE_PACK_MANUAL_POLICY_SOURCE,
            createdAt: now,
            updatedAt: now
          }))
      ];
      const policies = (Array.isArray(raw.policyRules) ? raw.policyRules : []) as Array<{
        sourcePluginId: string;
      }>;
      patch.policyRules = [
        ...policies.filter((rule) => rule.sourcePluginId !== "core-pack-permission-overrides"),
        ...[...baseKeys]
          .filter((key) => !desired.has(key))
          .map((permissionPattern) => ({
            effect: "deny",
            permissionPattern,
            conditions: [],
            sourcePluginId: "core-pack-permission-overrides",
            createdAt: now,
            updatedAt: now
          }))
      ];
      patch.permissions = [...desired];
    }
    if (!(await this.repository.rawCompareAndSwap(role.id, expectedUpdatedAt, patch))) {
      throw new CoreError("iam_revision_conflict", "Role changed; reload before saving");
    }
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

    return Promise.all(
      roles.map(async (role) => ({
        ...role,
        permissions: await this.visiblePermissions(role, permissionMap.get(role.code) ?? [])
      }))
    );
  }

  private async hydrateRolePermissions(role: RoleRecord): Promise<RoleRecord> {
    const grants = await this.grants.listByRoleCode(role.code);
    const permissions = Array.from(new Set(grants.map((grant) => grant.permissionKey)));
    return {
      ...role,
      permissions: await this.visiblePermissions(role, permissions)
    };
  }
  private async visiblePermissions(role: RoleRecord, keys: readonly string[]): Promise<string[]> {
    const raw = await this.repository.findRawById(role.id);
    const policies = (Array.isArray(raw?.policyRules) ? raw.policyRules : []) as Array<{
      sourcePluginId: string;
      permissionPattern: string;
    }>;
    const denied = new Set(
      policies
        .filter((rule) => rule.sourcePluginId === "core-pack-permission-overrides")
        .map((rule) => rule.permissionPattern)
    );
    return keys.filter((key) => !denied.has(key));
  }
}
