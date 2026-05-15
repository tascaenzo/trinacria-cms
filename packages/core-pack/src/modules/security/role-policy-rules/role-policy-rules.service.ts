import { isValidPermissionPattern } from "@trinacria-cms/kernel";
import { CORE_PACK_MANUAL_POLICY_SOURCE } from "../../../plugin/core-pack.constants.js";
import { RolesRepository } from "../../roles/roles.repository.js";
import type { UpsertRolePolicyRuleInput } from "./role-policy-rules.repository.js";
import { RolePolicyRulesRepository } from "./role-policy-rules.repository.js";

/**
 * Application service for role policy rule CRUD APIs.
 */
export class RolePolicyRulesService {
  constructor(
    private readonly roles: RolesRepository,
    private readonly rules: RolePolicyRulesRepository
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
  ) {
    const role = await this.roles.findByCode(roleCode);
    if (!role) return null;

    const normalizedPattern = input.permissionPattern.trim().toLowerCase();
    if (!isValidPermissionPattern(normalizedPattern)) {
      throw new Error(
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
      throw new Error("Role policy rule already exists");
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
  ) {
    const role = await this.roles.findByCode(roleCode);
    if (!role) return null;

    const existing = await this.rules.findById(id);
    if (!existing || existing.roleCode !== role.code) {
      return null;
    }

    const normalizedPattern = input.permissionPattern.trim().toLowerCase();
    if (!isValidPermissionPattern(normalizedPattern)) {
      throw new Error(
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
    const role = await this.roles.findByCode(roleCode);
    if (!role) return null;

    const existing = await this.rules.findById(id);
    if (!existing || existing.roleCode !== role.code) {
      return false;
    }

    return this.rules.deleteById(id);
  }
}
