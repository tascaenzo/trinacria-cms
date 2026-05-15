import type {
  PluginManifest,
  PluginManifestSecurity,
  PluginManifestSecurityGrant,
  PluginManifestSecurityPolicyRule,
  PluginManifestSecurityPermission,
  PluginManifestSecurityRole,
  PluginSecurityProvisioner
} from "@trinacria-cms/kernel";
import { PermissionsRepository } from "../permissions/permissions.repository.js";
import { RoleGrantsRepository } from "../roles/grants/role-grants.repository.js";
import { RolesRepository } from "../roles/roles.repository.js";
import { RolePolicyRulesRepository } from "./role-policy-rules/role-policy-rules.repository.js";
import { UserRolesRepository } from "./user-access/user-roles.repository.js";

interface NormalizedSecurityManifest {
  permissions: readonly PluginManifestSecurityPermission[];
  roles: readonly PluginManifestSecurityRole[];
  grants: readonly PluginManifestSecurityGrant[];
  policyRules: readonly PluginManifestSecurityPolicyRule[];
}

/**
 * Provisions plugin-contributed permissions, roles, and grants.
 * Ownership is tracked by `sourcePluginId` to keep uninstall operations safe.
 */
export class CorePackSecurityProvisioningService implements PluginSecurityProvisioner {
  constructor(
    private readonly roles: RolesRepository,
    private readonly roleGrants: RoleGrantsRepository,
    private readonly rolePolicyRules: RolePolicyRulesRepository,
    private readonly permissions: PermissionsRepository,
    private readonly userRoles: UserRolesRepository
  ) {}

  async provision(manifest: PluginManifest): Promise<void> {
    const pluginId = manifest.id.trim().toLowerCase();
    const security = this.normalizeSecurity(manifest.security);

    for (const permission of security.permissions) {
      await this.permissions.upsertOwnedPermission({
        key: permission.key,
        displayName: permission.displayName,
        description: permission.description,
        sourcePluginId: pluginId
      });
    }

    for (const role of security.roles) {
      await this.roles.upsertOwnedRole({
        code: role.code,
        name: role.name,
        description: role.description,
        ownerPluginId: pluginId
      });
    }

    for (const grant of security.grants) {
      const targetRole = await this.roles.findByCode(grant.roleCode);
      if (!targetRole) {
        throw new Error(
          `Cannot provision grants for plugin "${pluginId}": role "${grant.roleCode}" does not exist`
        );
      }

      for (const permissionKey of grant.permissionKeys) {
        const targetPermission = await this.permissions.findByKey(permissionKey);
        if (!targetPermission) {
          throw new Error(
            `Cannot provision grants for plugin "${pluginId}": permission "${permissionKey}" does not exist`
          );
        }

        await this.roleGrants.upsert({
          roleCode: grant.roleCode,
          permissionKey,
          sourcePluginId: pluginId
        });
      }
    }

    for (const rule of security.policyRules) {
      const targetRole = await this.roles.findByCode(rule.roleCode);
      if (!targetRole) {
        throw new Error(
          `Cannot provision policy rules for plugin "${pluginId}": role "${rule.roleCode}" does not exist`
        );
      }

      await this.rolePolicyRules.upsert({
        roleCode: rule.roleCode,
        effect: rule.effect,
        permissionPattern: rule.permissionPattern,
        conditions: rule.conditions,
        sourcePluginId: pluginId
      });
    }

    await this.syncOwnedGrants(pluginId, security);
    await this.syncOwnedPolicyRules(pluginId, security);
    await this.syncOwnedPermissions(pluginId, security);
    await this.syncOwnedRoles(pluginId, security);
  }

  async deprovision(manifest: PluginManifest): Promise<void> {
    const pluginId = manifest.id.trim().toLowerCase();
    await this.userRoles.deleteBySourcePlugin(pluginId);
    await this.roleGrants.deleteBySourcePlugin(pluginId);
    await this.rolePolicyRules.deleteBySourcePlugin(pluginId);

    const ownedPermissions = await this.permissions.listBySourcePlugin(pluginId);
    for (const permission of ownedPermissions) {
      await this.permissions.deleteById(permission.id);
    }

    const ownedRoles = await this.roles.listOwnedByPlugin(pluginId);
    for (const role of ownedRoles) {
      const hasForeignGrants = await this.roleGrants.hasGrantFromOtherPlugins(role.code, pluginId);
      if (hasForeignGrants) {
        await this.roles.updateStatus(role.id, { status: "disabled" });
        continue;
      }
      await this.roleGrants.deleteByRoleCode(role.code);
      await this.roles.deleteById(role.id);
    }
  }

  private async syncOwnedGrants(
    pluginId: string,
    security: NormalizedSecurityManifest
  ): Promise<void> {
    const desired = new Set<string>();
    for (const grant of security.grants) {
      for (const permissionKey of grant.permissionKeys) {
        desired.add(this.serializeGrant(grant.roleCode, permissionKey, pluginId));
      }
    }

    const existing = await this.roleGrants.listBySourcePlugin(pluginId);
    for (const record of existing) {
      const key = this.serializeGrant(record.roleCode, record.permissionKey, record.sourcePluginId);
      if (!desired.has(key)) {
        await this.roleGrants.deleteById(record.id);
      }
    }
  }

  private async syncOwnedPermissions(
    pluginId: string,
    security: NormalizedSecurityManifest
  ): Promise<void> {
    const desiredPermissionKeys = new Set(
      security.permissions.map((item) => item.key.trim().toLowerCase())
    );
    const existingPermissions = await this.permissions.listBySourcePlugin(pluginId);

    for (const permission of existingPermissions) {
      if (desiredPermissionKeys.has(permission.key)) continue;
      await this.permissions.deleteById(permission.id);
    }
  }

  private async syncOwnedPolicyRules(
    pluginId: string,
    security: NormalizedSecurityManifest
  ): Promise<void> {
    const desired = new Set(
      security.policyRules.map((rule) =>
        this.serializePolicyRule(
          rule.roleCode,
          rule.effect,
          rule.permissionPattern,
          rule.conditions ?? [],
          pluginId
        )
      )
    );

    const existing = await this.rolePolicyRules.listBySourcePlugin(pluginId);
    for (const record of existing) {
      const key = this.serializePolicyRule(
        record.roleCode,
        record.effect,
        record.permissionPattern,
        record.conditions,
        record.sourcePluginId
      );
      if (!desired.has(key)) {
        await this.rolePolicyRules.deleteById(record.id);
      }
    }
  }

  private async syncOwnedRoles(
    pluginId: string,
    security: NormalizedSecurityManifest
  ): Promise<void> {
    const desiredRoleCodes = new Set(security.roles.map((item) => item.code.trim().toLowerCase()));
    const existingRoles = await this.roles.listOwnedByPlugin(pluginId);

    for (const role of existingRoles) {
      if (desiredRoleCodes.has(role.code)) continue;

      const hasForeignGrants = await this.roleGrants.hasGrantFromOtherPlugins(role.code, pluginId);
      if (hasForeignGrants) {
        await this.roles.updateStatus(role.id, { status: "disabled" });
        continue;
      }

      await this.roleGrants.deleteByRoleCode(role.code);
      await this.roles.deleteById(role.id);
    }
  }

  private serializeGrant(roleCode: string, permissionKey: string, sourcePluginId: string): string {
    return `${roleCode.trim().toLowerCase()}|${permissionKey
      .trim()
      .toLowerCase()}|${sourcePluginId.trim().toLowerCase()}`;
  }

  private serializePolicyRule(
    roleCode: string,
    effect: "allow" | "deny",
    permissionPattern: string,
    conditions: readonly string[],
    sourcePluginId: string
  ): string {
    const normalizedConditions = Array.from(
      new Set(conditions.map((item) => item.trim().toLowerCase()).sort())
    );
    return `${roleCode.trim().toLowerCase()}|${effect}|${permissionPattern
      .trim()
      .toLowerCase()}|${normalizedConditions.join(",")}|${sourcePluginId.trim().toLowerCase()}`;
  }

  private normalizeSecurity(
    security: PluginManifestSecurity | undefined
  ): NormalizedSecurityManifest {
    return {
      permissions: security?.permissions ?? [],
      roles: security?.roles ?? [],
      grants: security?.grants ?? [],
      policyRules: security?.policyRules ?? []
    };
  }
}
