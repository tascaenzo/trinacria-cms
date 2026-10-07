import { CoreError } from "@trinacria-cms/kernel";
import { isValidPermissionPattern } from "@trinacria-cms/kernel/runtime";
import { CORE_PACK_MANUAL_POLICY_SOURCE } from "../../../plugin/core-pack.constants.js";
import type { RolesRepository } from "../../roles/repositories/roles.repository.js";
import type {
  RolePolicyRulesRepository,
  UpsertRolePolicyRuleInput
} from "./role-policy-rules.repository.js";
import type { RolePolicyRuleRecord } from "./role-policy-rules.schemas.js";

/**
 * Application service for role policy rule CRUD APIs.
 */
export class RolePolicyRulesService {
  constructor(
    private readonly roles: RolesRepository,
    private readonly rules: RolePolicyRulesRepository,
    private readonly atomic?: <T>(
      work: (service: RolePolicyRulesService) => Promise<T>
    ) => Promise<T>
  ) {}

  async listByRoleCode(roleCode: string) {
    const role = await this.roles.findByCode(roleCode);
    if (!role) return null;
    return this.rules.listByRoleCode(role.code);
  }

  async create(
    roleCode: string,
    input: {
      effect: "allow" | "deny";
      permissionPattern: string;
      conditions?: readonly ("resource_id_required" | "resource_id_equals_subject")[];
    }
  ): Promise<RolePolicyRuleRecord | null> {
    if (this.atomic) return this.atomic((service) => service.create(roleCode, input));
    const role = await this.roles.findByCode(roleCode);
    if (!role) return null;

    const normalizedPattern = input.permissionPattern.trim().toLowerCase();
    if (!isValidPermissionPattern(normalizedPattern)) {
      throw new CoreError(
        "invalid_request",
        `Invalid permission pattern "${input.permissionPattern}". Expected '<pluginId>:<resource|*>:<action|*>'`
      );
    }

    const candidate: UpsertRolePolicyRuleInput = {
      roleCode: role.code,
      effect: input.effect,
      permissionPattern: normalizedPattern,
      conditions: input.conditions ?? [],
      sourcePluginId: CORE_PACK_MANUAL_POLICY_SOURCE
    };
    const existing = await this.rules.findOne(candidate);
    if (existing) {
      throw new CoreError("conflict", "Role policy rule already exists");
    }

    return this.rules.upsert(candidate);
  }

  async update(
    roleCode: string,
    id: string,
    input: {
      effect: "allow" | "deny";
      permissionPattern: string;
      conditions?: readonly ("resource_id_required" | "resource_id_equals_subject")[];
    }
  ): Promise<RolePolicyRuleRecord | null> {
    if (this.atomic) return this.atomic((service) => service.update(roleCode, id, input));
    const role = await this.roles.findByCode(roleCode);
    if (!role) return null;

    const existing = await this.rules.findById(id);
    if (!existing || existing.roleCode !== role.code) {
      return null;
    }
    this.assertManualRule(existing);

    const normalizedPattern = input.permissionPattern.trim().toLowerCase();
    if (!isValidPermissionPattern(normalizedPattern)) {
      throw new CoreError(
        "invalid_request",
        `Invalid permission pattern "${input.permissionPattern}". Expected '<pluginId>:<resource|*>:<action|*>'`
      );
    }

    return this.rules.updateById(id, {
      effect: input.effect,
      permissionPattern: normalizedPattern,
      conditions: input.conditions ?? [],
      updatedAt: new Date().toISOString()
    });
  }

  async delete(roleCode: string, id: string): Promise<boolean | null> {
    if (this.atomic) return this.atomic((service) => service.delete(roleCode, id));
    const role = await this.roles.findByCode(roleCode);
    if (!role) return null;

    const existing = await this.rules.findById(id);
    if (!existing || existing.roleCode !== role.code) {
      return false;
    }
    this.assertManualRule(existing);

    return this.rules.deleteById(id);
  }
  private assertManualRule(rule: RolePolicyRuleRecord) {
    if (rule.sourcePluginId !== CORE_PACK_MANUAL_POLICY_SOURCE) {
      throw new CoreError(
        "iam_protected_policy",
        "Plugin policies are read-only; add a manual rule to override access"
      );
    }
  }
}
