import { CoreError, type DbAdapter } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import { PermissionsRepository } from "../../permissions/repositories/permissions.repository.js";
import { RoleGrantsRepository } from "../../roles/grants/role-grants.repository.js";
import { RolesRepository } from "../../roles/repositories/roles.repository.js";
import { UsersRepository } from "../../users/repositories/users.repository.js";
import {
  type AuthorizationRule,
  dedupeAuthorizationRules,
  isPermissionAllowed
} from "../policies/authz-rules.js";
import { RolePolicyRulesRepository } from "../role-policy-rules/role-policy-rules.repository.js";
import { UserRolesRepository } from "./user-roles.repository.js";
import type { UserRoleRecord } from "./user-roles.schemas.js";

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
    private readonly userRoles: UserRolesRepository,
    private readonly atomic?: <T>(work: (service: UserAccessService) => Promise<T>) => Promise<T>
  ) {}

  /** Host-only transaction rebinding. */
  forDb(db: DbAdapter): UserAccessService {
    return new UserAccessService(
      new UsersRepository(db),
      new RolesRepository(db),
      new RoleGrantsRepository(db),
      new RolePolicyRulesRepository(db),
      new PermissionsRepository(db),
      new UserRolesRepository(db)
    );
  }

  async assignRoleToUser(userId: string, roleCode: string): Promise<UserRoleRecord> {
    if (this.atomic) return this.atomic((service) => service.assignRoleToUser(userId, roleCode));
    const user = await this.assertUserExists(userId);
    if (user.status !== "active") {
      throw new CoreError("invalid_request", `User "${user.id}" is not active`);
    }

    const role = await this.roles.findByCode(roleCode);
    if (!role) {
      throw new CoreError("not_found", `Role "${roleCode}" not found`);
    }
    if (role.status !== "active") {
      throw new CoreError("invalid_request", `Role "${roleCode}" is not active`);
    }

    return this.userRoles.upsert({
      userId: user.id,
      roleCode: role.code,
      sourcePluginId: CORE_PACK_PLUGIN_ID
    });
  }

  async removeRoleFromUser(userId: string, roleCode: string): Promise<boolean> {
    if (this.atomic) return this.atomic((service) => service.removeRoleFromUser(userId, roleCode));
    await this.assertUserExists(userId);
    return this.userRoles.deleteByUserAndRole(userId, roleCode);
  }

  async listUserRoles(userId: string) {
    await this.assertUserExists(userId);
    return this.userRoles.listByUserId(userId);
  }

  private async resolveUserGrantedPermissions(userId: string): Promise<readonly string[]> {
    const user = await this.assertUserExists(userId);
    if (user.status !== "active") return [];

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

  async isPermissionActive(key: string): Promise<boolean> {
    return (await this.permissions.findByKey(key))?.status === "active";
  }

  async resolveUserPermissions(userId: string, resourceId?: string): Promise<readonly string[]> {
    const user = await this.assertUserExists(userId);
    if (user.status !== "active") return [];
    const rules = await this.resolveUserAuthorizationRules(userId);
    const permissions = await this.permissions.list();
    return permissions
      .filter(
        (permission) =>
          permission.status === "active" &&
          isPermissionAllowed(rules, permission.key, userId, resourceId)
      )
      .map((permission) => permission.key);
  }

  async resolveUserAuthorizationRules(userId: string): Promise<readonly AuthorizationRule[]> {
    const user = await this.assertUserExists(userId);
    if (user.status !== "active") return [];

    const activeRoleCodes = await this.resolveActiveRoleCodes(userId);
    if (activeRoleCodes.length === 0) return [];

    const allowFromGrants = (await this.resolveUserGrantedPermissions(userId)).map(
      (permissionKey) =>
        ({
          effect: "allow" as const,
          permissionPattern: permissionKey,
          conditions: []
        }) satisfies AuthorizationRule
    );

    const mappedPolicies: AuthorizationRule[] = (
      await this.rolePolicyRules.listByRoleCodes(activeRoleCodes)
    ).map((rule) => ({
      effect: rule.effect,
      permissionPattern: rule.permissionPattern,
      conditions: rule.conditions
    }));

    const rules = dedupeAuthorizationRules([...allowFromGrants, ...mappedPolicies]);
    // Domain packs own their role grants. Their explicit backoffice access also enables
    // the shared shell without granting Core administration or diagnostic privileges.
    const catalog = await this.permissions.list();
    const domainAccess = catalog.some(
      (permission) =>
        permission.status === "active" &&
        permission.key !== "core-pack:backoffice:access" &&
        permission.key.endsWith(":backoffice:access") &&
        isPermissionAllowed(rules, permission.key, userId)
    );
    return domainAccess
      ? dedupeAuthorizationRules([
          ...rules,
          { effect: "allow", permissionPattern: "core-pack:backoffice:access", conditions: [] }
        ])
      : rules;
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
      throw new CoreError("not_found", `User "${userId}" not found`);
    }
    return user;
  }
}
