import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import {
  RolePolicyRuleConditionSchema,
  RolePolicyRuleEffectSchema,
  RolePolicyRuleRecordSchema,
  type RolePolicyRuleRecord
} from "./role-policy-rules.schemas.js";

const ROLE_POLICY_RULES_ENTITY_NAME = "role_policy_rules";

export interface UpsertRolePolicyRuleInput {
  roleCode: string;
  effect: "allow" | "deny";
  permissionPattern: string;
  conditions?: readonly ("resource_id_required" | "resource_id_equals_subject")[];
  sourcePluginId: string;
}

interface NormalizedRolePolicyRuleInput {
  roleCode: string;
  effect: "allow" | "deny";
  permissionPattern: string;
  conditions: ("resource_id_required" | "resource_id_equals_subject")[];
  sourcePluginId: string;
}

/**
 * Persistence adapter for role policy rules.
 */
export class RolePolicyRulesRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async upsert(input: UpsertRolePolicyRuleInput): Promise<RolePolicyRuleRecord> {
    const normalized = this.normalizeInput(input);
    const existing = await this.findOne(normalized);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const created = await this.repository().insertOne({
      roleCode: normalized.roleCode,
      effect: normalized.effect,
      permissionPattern: normalized.permissionPattern,
      conditions: normalized.conditions,
      sourcePluginId: normalized.sourcePluginId,
      createdAt: now,
      updatedAt: now
    });
    return RolePolicyRuleRecordSchema.parse(created);
  }

  async findOne(input: UpsertRolePolicyRuleInput): Promise<RolePolicyRuleRecord | null> {
    const normalized = this.normalizeInput(input);
    const records = await this.repository().findMany({
      filter: {
        roleCode: normalized.roleCode,
        effect: normalized.effect,
        permissionPattern: normalized.permissionPattern,
        sourcePluginId: normalized.sourcePluginId
      },
      parse: (value: unknown) => RolePolicyRuleRecordSchema.parse(value)
    });

    const targetKey = normalized.conditions.join(",");
    return records.find((record) => record.conditions.join(",") === targetKey) ?? null;
  }

  async listByRoleCodes(roleCodes: readonly string[]): Promise<readonly RolePolicyRuleRecord[]> {
    const targets = new Set(roleCodes.map((roleCode) => roleCode.trim().toLowerCase()));
    if (targets.size === 0) return [];
    const all = await this.repository().findMany({
      parse: (value: unknown) => RolePolicyRuleRecordSchema.parse(value)
    });
    return all.filter((item) => targets.has(item.roleCode));
  }

  async listByRoleCode(roleCode: string): Promise<readonly RolePolicyRuleRecord[]> {
    return this.repository().findMany({
      filter: { roleCode: roleCode.trim().toLowerCase() },
      parse: (value: unknown) => RolePolicyRuleRecordSchema.parse(value),
      sort: { createdAt: "asc" }
    });
  }

  async findById(id: string): Promise<RolePolicyRuleRecord | null> {
    return this.repository().findOne({
      filter: { id },
      parse: (value: unknown) => RolePolicyRuleRecordSchema.parse(value)
    });
  }

  async listBySourcePlugin(sourcePluginId: string): Promise<readonly RolePolicyRuleRecord[]> {
    return this.repository().findMany({
      filter: { sourcePluginId: sourcePluginId.trim().toLowerCase() },
      parse: (value: unknown) => RolePolicyRuleRecordSchema.parse(value)
    });
  }

  async deleteById(id: string): Promise<boolean> {
    return this.repository().deleteOne({ filter: { id } });
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

  async updateById(
    id: string,
    patch: {
      effect: "allow" | "deny";
      permissionPattern: string;
      conditions: readonly ("resource_id_required" | "resource_id_equals_subject")[];
      updatedAt: string;
    }
  ): Promise<RolePolicyRuleRecord | null> {
    const updated = await this.repository().updateOne(
      { filter: { id } },
      {
        effect: patch.effect,
        permissionPattern: patch.permissionPattern.trim().toLowerCase(),
        conditions: [...patch.conditions],
        updatedAt: patch.updatedAt
      }
    );
    if (!updated) return null;
    return RolePolicyRuleRecordSchema.parse(updated);
  }

  private normalizeInput(input: UpsertRolePolicyRuleInput): NormalizedRolePolicyRuleInput {
    const conditions = Array.from(
      new Set(
        (input.conditions ?? []).map((item) => RolePolicyRuleConditionSchema.parse(item)).sort()
      )
    );

    return {
      roleCode: input.roleCode.trim().toLowerCase(),
      effect: RolePolicyRuleEffectSchema.parse(input.effect),
      permissionPattern: input.permissionPattern.trim().toLowerCase(),
      conditions,
      sourcePluginId: input.sourcePluginId.trim().toLowerCase()
    };
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<RolePolicyRuleRecord>(ROLE_POLICY_RULES_ENTITY_NAME);
  }
}
