import {
  type PluginManifest,
  type PluginManifestSetting,
  type PluginManifestSecurity,
  type PluginManifestSecurityGrant,
  type PluginManifestSecurityPolicyRule,
  type PluginManifestSecurityPermission,
  type PluginManifestSecurityRole,
  type PluginManifestProvisioner,
  type PluginTranslationSource
} from "@trinacria-cms/kernel";
import { PermissionsRepository } from "../../permissions/repositories/permissions.repository.js";
import { RoleGrantsRepository } from "../../roles/grants/role-grants.repository.js";
import { RolesRepository } from "../../roles/repositories/roles.repository.js";
import {
  EmbeddedRolePolicyRuleSchema,
  type EmbeddedRolePolicyRule
} from "../../roles/roles.schemas.js";
import { SettingsService } from "../../settings/services/settings.service.js";
import { I18nMessagesService } from "../../i18n/i18n-messages.service.js";
import { UserRolesRepository } from "../user-access/user-roles.repository.js";

const RETIRED_CORE_PACK_SETTING_KEYS = new Set(["core-pack:features:editorial_workflow"]);

interface NormalizedSecurityManifest {
  permissions: readonly PluginManifestSecurityPermission[];
  roles: readonly PluginManifestSecurityRole[];
  grants: readonly PluginManifestSecurityGrant[];
  policyRules: readonly PluginManifestSecurityPolicyRule[];
}

/**
 * Materializes manifest-owned Core resources: security, settings, and i18n.
 * Ownership is tracked by `sourcePluginId` to keep uninstall operations safe.
 *
 * Policy rules are stored as an embedded array inside the role document
 * (no separate collection is used).
 */
export class CorePackManifestProvisioningService implements PluginManifestProvisioner {
  private static readonly POLICY_UPDATE_MAX_RETRIES = 3;
  private readonly deferredManifests = new Map<string, PluginManifest>();

  constructor(
    private readonly roles: RolesRepository,
    private readonly roleGrants: RoleGrantsRepository,
    private readonly permissions: PermissionsRepository,
    private readonly userRoles: UserRolesRepository,
    private readonly settings: SettingsService,
    private readonly i18nMessages?: I18nMessagesService
  ) {}

  async provision(
    manifest: PluginManifest,
    i18nSources: readonly PluginTranslationSource[] = []
  ): Promise<void> {
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

      await this.upsertEmbeddedPolicyRule(targetRole.id, {
        effect: rule.effect,
        permissionPattern: rule.permissionPattern,
        conditions: rule.conditions ?? [],
        sourcePluginId: pluginId
      });
    }

    await this.syncOwnedGrants(pluginId, security);
    await this.syncOwnedPermissions(pluginId, security);
    await this.syncOwnedPolicyRules(pluginId, security);
    await this.syncOwnedRoles(pluginId, security);
    await this.syncManifestSettings(pluginId, manifest.settings ?? []);
    await this.i18nMessages?.syncManifest(manifest, i18nSources);
    this.deferredManifests.delete(pluginId);
  }

  defer(manifest: PluginManifest): void {
    this.deferredManifests.set(manifest.id.trim().toLowerCase(), manifest);
  }

  async provisionDeferred(): Promise<void> {
    for (const manifest of [...this.deferredManifests.values()]) {
      await this.provision(manifest);
    }
  }

  async deprovision(manifest: PluginManifest): Promise<void> {
    const pluginId = manifest.id.trim().toLowerCase();
    await this.i18nMessages?.removePlugin(pluginId);
    await this.userRoles.deleteBySourcePlugin(pluginId);
    await this.roleGrants.deleteBySourcePlugin(pluginId);
    await this.deletePolicyRulesBySourcePlugin(pluginId);

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

    const existingDefinitions = await this.settings.listDefinitions({ ownerPluginId: pluginId });
    for (const definition of existingDefinitions) {
      await this.settings.upsertDefinition({
        requesterPluginId: pluginId,
        key: definition.key,
        category: definition.category,
        description: definition.description,
        schema: definition.schema,
        defaultValue: definition.defaultValue,
        status: "disabled"
      });
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

  private async upsertEmbeddedPolicyRule(
    roleId: string,
    rule: {
      effect: "allow" | "deny";
      permissionPattern: string;
      conditions: readonly string[];
      sourcePluginId: string;
    }
  ): Promise<void> {
    const normalizedPattern = rule.permissionPattern.trim().toLowerCase();
    const normalizedSource = rule.sourcePluginId.trim().toLowerCase();
    const normalizedConditions = Array.from(
      new Set(rule.conditions.map((c) => c.trim().toLowerCase()).sort())
    );

    for (
      let attempt = 0;
      attempt < CorePackManifestProvisioningService.POLICY_UPDATE_MAX_RETRIES;
      attempt += 1
    ) {
      const role = await this.roles.findRawById(roleId);
      if (!role) return;
      const roleRecord = role as Record<string, unknown>;
      const existingRules = Array.isArray(roleRecord.policyRules)
        ? (roleRecord.policyRules as EmbeddedRolePolicyRule[])
        : [];
      const conflict = existingRules.find(
        (r) =>
          r.effect === rule.effect &&
          r.permissionPattern === normalizedPattern &&
          r.sourcePluginId === normalizedSource &&
          r.conditions.join(",") === normalizedConditions.join(",")
      );
      if (conflict) return;

      const now = new Date().toISOString();
      const newRule = EmbeddedRolePolicyRuleSchema.parse({
        effect: rule.effect,
        permissionPattern: normalizedPattern,
        conditions: normalizedConditions,
        sourcePluginId: normalizedSource,
        createdAt: now,
        updatedAt: now
      });
      const updated = await this.roles.rawCompareAndSwap(
        String(roleRecord.id ?? ""),
        String(roleRecord.updatedAt ?? ""),
        { policyRules: [...existingRules, newRule], updatedAt: now }
      );
      if (updated) return;
    }
    throw new Error(`Policy rule upsert failed due to concurrent updates for role "${roleId}"`);
  }

  private async listRolesPolicyRules(roleId: string): Promise<readonly EmbeddedRolePolicyRule[]> {
    const role = await this.roles.findRawById(roleId);
    if (!role) return [];
    const rules = (role as Record<string, unknown>).policyRules;
    return Array.isArray(rules) ? (rules as EmbeddedRolePolicyRule[]) : [];
  }

  private async deletePolicyRulesBySourcePlugin(sourcePluginId: string): Promise<void> {
    const normalizedSource = sourcePluginId.trim().toLowerCase();
    const allRoles = await this.roles.list();
    for (const role of allRoles) {
      const existingRules = await this.listRolesPolicyRules(role.id);
      const remaining = existingRules.filter((r) => r.sourcePluginId !== normalizedSource);
      if (remaining.length === existingRules.length) continue;

      await this.updateRolePolicyRulesWithRetry(role.id, (existingRules) => {
        const next = existingRules.filter((r) => r.sourcePluginId !== normalizedSource);
        return next.length === existingRules.length ? null : next;
      });
    }
  }

  private async syncOwnedPolicyRules(
    pluginId: string,
    security: NormalizedSecurityManifest
  ): Promise<void> {
    const normalizedPluginId = pluginId.trim().toLowerCase();
    const desiredByRole = new Map<string, Set<string>>();
    for (const rule of security.policyRules) {
      const rc = rule.roleCode.trim().toLowerCase();
      const conds = Array.from(
        new Set((rule.conditions ?? []).map((c) => c.trim().toLowerCase()).sort())
      );
      const key = `${rc}|${rule.effect}|${rule.permissionPattern.trim().toLowerCase()}|${conds.join(",")}`;
      if (!desiredByRole.has(rc)) desiredByRole.set(rc, new Set());
      desiredByRole.get(rc)!.add(key);
    }

    const allRoles = await this.roles.list();
    for (const role of allRoles) {
      const existing = await this.listRolesPolicyRules(role.id);
      const desired = desiredByRole.get(role.code);
      const remaining = existing.filter((r) => {
        if (r.sourcePluginId !== normalizedPluginId) return true;
        if (!desired) return false;
        const key = `${role.code}|${r.effect}|${r.permissionPattern}|${r.conditions.join(",")}`;
        return desired.has(key);
      });
      if (remaining.length === existing.length) continue;
      await this.updateRolePolicyRulesWithRetry(role.id, () => remaining);
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

  private async syncManifestSettings(
    pluginId: string,
    settings: readonly PluginManifestSetting[]
  ): Promise<void> {
    const desiredKeys = new Set<string>();
    for (const setting of settings) {
      const fullKey = setting.key.trim().toLowerCase();
      desiredKeys.add(fullKey);
      await this.settings.upsertDefinition({
        requesterPluginId: pluginId,
        key: fullKey,
        category: setting.category,
        description: setting.description,
        ...(setting.schema !== undefined ? { schema: setting.schema } : {}),
        ...(setting.defaultValue !== undefined ? { defaultValue: setting.defaultValue } : {}),
        visibility: setting.visibility ?? "public",
        mutable: setting.mutable ?? true,
        secret: setting.secret ?? false,
        status: setting.status ?? "active"
      });
    }

    const existingDefinitions = await this.settings.listDefinitions({ ownerPluginId: pluginId });
    for (const definition of existingDefinitions) {
      if (desiredKeys.has(definition.key)) continue;
      if (pluginId === "core-pack" && RETIRED_CORE_PACK_SETTING_KEYS.has(definition.key)) {
        await this.settings.deleteRetiredSetting({ requesterPluginId: pluginId, key: definition.key });
        continue;
      }
      await this.settings.upsertDefinition({
        requesterPluginId: pluginId,
        key: definition.key,
        category: definition.category,
        description: definition.description,
        schema: definition.schema,
        defaultValue: definition.defaultValue,
        status: "disabled"
      });
    }
  }

  private async updateRolePolicyRulesWithRetry(
    roleId: string,
    mutate: (existingRules: readonly EmbeddedRolePolicyRule[]) => EmbeddedRolePolicyRule[] | null
  ): Promise<void> {
    for (
      let attempt = 0;
      attempt < CorePackManifestProvisioningService.POLICY_UPDATE_MAX_RETRIES;
      attempt += 1
    ) {
      const raw = await this.roles.findRawById(roleId);
      if (!raw) return;
      const role = raw as Record<string, unknown>;
      const existingRules = Array.isArray(role.policyRules)
        ? (role.policyRules as EmbeddedRolePolicyRule[])
        : [];
      const nextRules = mutate(existingRules);
      if (!nextRules) return;
      const now = new Date().toISOString();
      const updated = await this.roles.rawCompareAndSwap(
        String(role.id ?? ""),
        String(role.updatedAt ?? ""),
        { policyRules: nextRules, updatedAt: now }
      );
      if (updated) return;
    }
    throw new Error(`Policy rule update failed due to concurrent updates for role "${roleId}"`);
  }
}
