import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import {
  EmbeddedRolePolicyRuleSchema,
  RolePolicyRuleRecordSchema,
  type RolePolicyRuleRecord
} from "./role-policy-rules.schemas.js";
import type { EmbeddedRolePolicyRule } from "../../roles/roles.schemas.js";

const ROLES_ENTITY_NAME = "roles";

export interface UpsertRolePolicyRuleInput {
  roleCode: string;
  effect: "allow" | "deny";
  permissionPattern: string;
  conditions?: readonly ("resource_id_required" | "resource_id_equals_subject")[];
  sourcePluginId: string;
}

/**
 * Persistence adapter for role policy rules backed by embedded arrays in `roles`.
 * No separate collection is used — rules are stored inside the role document.
 */
export class RolePolicyRulesRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async upsert(input: UpsertRolePolicyRuleInput): Promise<RolePolicyRuleRecord> {
    const normalized = this.normalizeInput(input);
    const existing = await this.findOne(normalized);
    if (existing) return existing;

    const role = await this.findRoleByCode(normalized.roleCode);
    if (!role) throw new Error(`Role "${normalized.roleCode}" not found`);

    const now = new Date().toISOString();
    const createdRule = EmbeddedRolePolicyRuleSchema.parse({
      effect: normalized.effect,
      permissionPattern: normalized.permissionPattern,
      conditions: normalized.conditions,
      sourcePluginId: normalized.sourcePluginId,
      createdAt: now,
      updatedAt: now
    });

    const allRules = [...role.policyRules, createdRule];
    await this.repository().updateOne(
      { filter: { id: role.id } },
      { policyRules: allRules, updatedAt: now }
    );

    return this.toRecord(role.code, createdRule);
  }

  async findById(id: string): Promise<RolePolicyRuleRecord | null> {
    const parsed = this.parseRuleId(id);
    if (!parsed) return null;
    const role = await this.findRoleByCode(parsed.roleCode);
    if (!role) return null;
    const match = role.policyRules.find((rule) => this.buildRuleId(role.code, rule) === id);
    return match ? this.toRecord(role.code, match) : null;
  }

  async findOne(input: UpsertRolePolicyRuleInput): Promise<RolePolicyRuleRecord | null> {
    const normalized = this.normalizeInput(input);
    const role = await this.findRoleByCode(normalized.roleCode);
    if (!role) return null;

    const match = role.policyRules.find(
      (rule) =>
        rule.effect === normalized.effect &&
        rule.permissionPattern === normalized.permissionPattern &&
        rule.sourcePluginId === normalized.sourcePluginId &&
        rule.conditions.join(",") === normalized.conditions.join(",")
    );
    return match ? this.toRecord(role.code, match) : null;
  }

  async listByRoleCodes(roleCodes: readonly string[]): Promise<readonly RolePolicyRuleRecord[]> {
    const targets = roleCodes.map((rc) => rc.trim().toLowerCase());
    if (targets.length === 0) return [];

    const all = await this.repository().findMany({});
    const results: RolePolicyRuleRecord[] = [];
    for (const raw of all) {
      const role = this.parseRoleDocument(raw);
      if (!targets.includes(role.code)) continue;
      for (const rule of role.policyRules) {
        results.push(this.toRecord(role.code, rule));
      }
    }
    return results;
  }

  async listByRoleCode(roleCode: string): Promise<readonly RolePolicyRuleRecord[]> {
    const role = await this.findRoleByCode(roleCode.trim().toLowerCase());
    if (!role) return [];
    return role.policyRules.map((rule) => this.toRecord(role.code, rule));
  }

  async listBySourcePlugin(sourcePluginId: string): Promise<readonly RolePolicyRuleRecord[]> {
    const normalizedSource = sourcePluginId.trim().toLowerCase();
    const all = await this.repository().findMany({});

    const results: RolePolicyRuleRecord[] = [];
    for (const raw of all) {
      const role = this.parseRoleDocument(raw);
      for (const rule of role.policyRules) {
        if (rule.sourcePluginId === normalizedSource) {
          results.push(this.toRecord(role.code, rule));
        }
      }
    }
    return results;
  }

  async deleteById(id: string): Promise<boolean> {
    const parsed = this.parseRuleId(id);
    if (!parsed) return false;
    const role = await this.findRoleByCode(parsed.roleCode);
    if (!role) return false;
    const index = role.policyRules.findIndex((rule) => this.buildRuleId(role.code, rule) === id);
    if (index === -1) return false;
    const rules = [...role.policyRules];
    rules.splice(index, 1);
    await this.repository().updateOne(
      { filter: { id: role.id } },
      {
        policyRules: rules,
        updatedAt: new Date().toISOString()
      }
    );
    return true;
  }

  async deleteBySourcePlugin(sourcePluginId: string): Promise<number> {
    const normalizedSource = sourcePluginId.trim().toLowerCase();
    const all = await this.repository().findMany({});
    let deleted = 0;

    for (const raw of all) {
      const role = this.parseRoleDocument(raw);
      const before = role.policyRules.length;
      const remaining = role.policyRules.filter((rule) => rule.sourcePluginId !== normalizedSource);
      if (remaining.length === before) continue;

      await this.repository().updateOne(
        { filter: { id: role.id } },
        {
          policyRules: remaining,
          updatedAt: new Date().toISOString()
        }
      );
      deleted += before - remaining.length;
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
    const parsed = this.parseRuleId(id);
    if (!parsed) return null;
    const role = await this.findRoleByCode(parsed.roleCode);
    if (!role) return null;
    const index = role.policyRules.findIndex((rule) => this.buildRuleId(role.code, rule) === id);
    if (index === -1) return null;
    const rules = [...role.policyRules];
    rules[index] = {
      ...rules[index],
      effect: patch.effect,
      permissionPattern: patch.permissionPattern.trim().toLowerCase(),
      conditions: [...patch.conditions],
      updatedAt: patch.updatedAt
    };
    await this.repository().updateOne(
      { filter: { id: role.id } },
      {
        policyRules: rules,
        updatedAt: patch.updatedAt
      }
    );
    return this.toRecord(role.code, rules[index]);
  }

  private normalizeInput(input: UpsertRolePolicyRuleInput): {
    roleCode: string;
    effect: "allow" | "deny";
    permissionPattern: string;
    conditions: ("resource_id_required" | "resource_id_equals_subject")[];
    sourcePluginId: string;
  } {
    const conditions: ("resource_id_required" | "resource_id_equals_subject")[] = Array.from(
      new Set((input.conditions ?? []).map((item) => item.trim()).sort())
    ) as ("resource_id_required" | "resource_id_equals_subject")[];
    return {
      roleCode: input.roleCode.trim().toLowerCase(),
      effect: input.effect === "allow" ? "allow" : "deny",
      permissionPattern: input.permissionPattern.trim().toLowerCase(),
      conditions,
      sourcePluginId: input.sourcePluginId.trim().toLowerCase()
    };
  }

  private toRecord(roleCode: string, rule: EmbeddedRolePolicyRule): RolePolicyRuleRecord {
    return RolePolicyRuleRecordSchema.parse({
      id: this.buildRuleId(roleCode, rule),
      roleCode,
      effect: rule.effect,
      permissionPattern: rule.permissionPattern,
      conditions: rule.conditions,
      sourcePluginId: rule.sourcePluginId,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt
    });
  }

  private buildRuleId(roleCode: string, rule: EmbeddedRolePolicyRule): string {
    return `${encodeURIComponent(roleCode)}::${encodeURIComponent(
      rule.effect
    )}::${encodeURIComponent(rule.permissionPattern)}::${encodeURIComponent(
      rule.sourcePluginId
    )}::${encodeURIComponent(rule.conditions.join(","))}`;
  }

  private parseRuleId(id: string): { roleCode: string } | null {
    const parts = id.split("::");
    if (parts.length < 5) return null;
    try {
      return { roleCode: decodeURIComponent(parts[0]).trim().toLowerCase() };
    } catch {
      return null;
    }
  }

  private async findRoleByCode(code: string): Promise<{
    id: string;
    code: string;
    policyRules: EmbeddedRolePolicyRule[];
  } | null> {
    const raw = await this.repository().findOne({
      filter: { code: code.trim().toLowerCase() }
    });
    if (!raw) return null;
    return this.parseRoleDocument(raw);
  }

  private parseRoleDocument(value: unknown): {
    id: string;
    code: string;
    policyRules: EmbeddedRolePolicyRule[];
  } {
    const record = (value ?? {}) as Record<string, unknown>;
    return {
      id: String(record.id ?? ""),
      code: String(record.code ?? "")
        .trim()
        .toLowerCase(),
      policyRules: Array.isArray(record.policyRules)
        ? (record.policyRules as EmbeddedRolePolicyRule[])
        : []
    };
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<Record<string, unknown>>(ROLES_ENTITY_NAME);
  }
}
