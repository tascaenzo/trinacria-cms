import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import { PermissionsRepository } from "../../permissions/permissions.repository.js";
import { RoleGrantsRepository } from "../../roles/grants/role-grants.repository.js";
import { RolesRepository } from "../../roles/roles.repository.js";
import { UsersRepository } from "../../users/users.repository.js";
import { RolePolicyRulesRepository } from "../role-policy-rules/role-policy-rules.repository.js";
import { dedupeAuthorizationRules, type AuthorizationRule } from "../authz-rules.js";
import { UserRolesRepository } from "./user-roles.repository.js";

/**
 * Coordinates user-role assignments and effective permission resolution.
 */
export class UserAccessService {
  constructor(
    private readonly users: UsersRepository,
    private readonly roles: RolesRepository,
    private readonly roleGrants: RoleGrantsRepository,
    private readonly rolePolicyRules: RolePolicyRulesRepository,
    private readonly permissions: PermissionsRepository,
    private readonly userRoles: UserRolesRepository
  ) {}

  async assignRoleToUser(userId: string, roleCode: string) {
    const user = await this.assertUserExists(userId);
    if (user.status !== "active") {
      throw new Error(`User "${user.id}" is not active`);
    }

    const role = await this.roles.findByCode(roleCode);
    if (!role) {
      throw new Error(`Role "${roleCode}" not found`);
    }
    if (role.status !== "active") {
      throw new Error(`Role "${roleCode}" is not active`);
    }

    return this.userRoles.upsert({
      userId: user.id,
      roleCode: role.code,
      sourcePluginId: CORE_PACK_PLUGIN_ID
    });
  }

  async removeRoleFromUser(userId: string, roleCode: string): Promise<boolean> {
    await this.assertUserExists(userId);
    return this.userRoles.deleteByUserAndRole(userId, roleCode);
  }

  async listUserRoles(userId: string) {
    await this.assertUserExists(userId);
    return this.userRoles.listByUserId(userId);
  }

  async resolveUserPermissions(userId: string): Promise<readonly string[]> {
    await this.assertUserExists(userId);

    const activeRoleCodes = await this.resolveActiveRoleCodes(userId);
    if (activeRoleCodes.length === 0) return [];

    const grants = await this.roleGrants.listByRoleCodes(activeRoleCodes);
    const grantedPermissionKeys = Array.from(new Set(grants.map((grant) => grant.permissionKey)));
    if (grantedPermissionKeys.length === 0) return [];

    const permissionRecords = await Promise.all(
      grantedPermissionKeys.map((key) => this.permissions.findByKey(key))
    );

    return permissionRecords
      .filter((permission): permission is NonNullable<typeof permission> => Boolean(permission))
      .filter((permission) => permission.status === "active")
      .map((permission) => permission.key);
  }

  async resolveUserAuthorizationRules(userId: string): Promise<readonly AuthorizationRule[]> {
    await this.assertUserExists(userId);

    const activeRoleCodes = await this.resolveActiveRoleCodes(userId);
    if (activeRoleCodes.length === 0) return [];

    const allowFromGrants = (await this.resolveUserPermissions(userId)).map(
      (permissionKey) =>
        ({
          effect: "allow" as const,
          permissionPattern: permissionKey,
          conditions: []
        }) satisfies AuthorizationRule
    );

    const policyRules = await this.rolePolicyRules.listByRoleCodes(activeRoleCodes);
    const mappedPolicies = policyRules.map(
      (rule) =>
        ({
          effect: rule.effect,
          permissionPattern: rule.permissionPattern,
          conditions: rule.conditions
        }) satisfies AuthorizationRule
    );

    return dedupeAuthorizationRules([...allowFromGrants, ...mappedPolicies]);
  }

  private async resolveActiveRoleCodes(userId: string): Promise<readonly string[]> {
    const assignments = await this.userRoles.listByUserId(userId);
    const roleCodes = Array.from(new Set(assignments.map((item) => item.roleCode)));
    if (roleCodes.length === 0) return [];

    const roles = await Promise.all(roleCodes.map((roleCode) => this.roles.findByCode(roleCode)));
    return roles
      .filter((role): role is NonNullable<typeof role> => Boolean(role))
      .filter((role) => role.status === "active")
      .map((role) => role.code);
  }

  private async assertUserExists(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new Error(`User "${userId}" not found`);
    }
    return user;
  }
}
