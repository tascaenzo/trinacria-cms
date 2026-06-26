import type {
  PluginManifestSecurity,
  PluginManifestSecurityGrant,
  PluginManifestSecurityPermission,
  PluginManifestSecurityPolicyCondition,
  PluginManifestSecurityPolicyRule,
  PluginManifestSecurityRole
} from "../contracts/plugin-manifest.js";
import { defineQualifiedKey, omitEmptyArray } from "./naming.js";

export interface DefinePermissionOptions {
  displayName: string;
  description?: string;
}

export interface DefinePermissionInput extends DefinePermissionOptions {
  pluginId: string;
  resource: string;
  action: string;
}

export interface DefinePermissionSetItem extends DefinePermissionOptions {
  resource: string;
  action: string;
}

export interface DefinedPermissionSet<T extends Record<string, DefinePermissionSetItem>> {
  keys: { readonly [K in keyof T]: string };
  permissions: readonly PluginManifestSecurityPermission[];
}

export function definePermissionKey(pluginId: string, resource: string, action: string): string {
  return defineQualifiedKey({ pluginId, segments: [resource, action] });
}

export function definePermission(input: DefinePermissionInput): PluginManifestSecurityPermission {
  return {
    key: definePermissionKey(input.pluginId, input.resource, input.action),
    displayName: input.displayName,
    ...(input.description !== undefined ? { description: input.description } : {})
  };
}

export function definePermissionSet<T extends Record<string, DefinePermissionSetItem>>(
  pluginId: string,
  items: T
): DefinedPermissionSet<T> {
  const keys = {} as { [K in keyof T]: string };
  const permissions: PluginManifestSecurityPermission[] = [];

  for (const [name, item] of Object.entries(items) as Array<[keyof T, T[keyof T]]>) {
    const key = definePermissionKey(pluginId, item.resource, item.action);
    keys[name] = key;
    permissions.push({
      key,
      displayName: item.displayName,
      ...(item.description !== undefined ? { description: item.description } : {})
    });
  }

  return { keys, permissions };
}

export function defineRole(input: PluginManifestSecurityRole): PluginManifestSecurityRole {
  return {
    code: input.code.trim().toLowerCase(),
    name: input.name,
    ...(input.description !== undefined ? { description: input.description } : {})
  };
}

export function defineGrant(input: PluginManifestSecurityGrant): PluginManifestSecurityGrant {
  return {
    roleCode: input.roleCode.trim().toLowerCase(),
    permissionKeys: [...input.permissionKeys]
  };
}

export interface DefinePolicyRuleInput {
  roleCode: string;
  effect?: "allow" | "deny";
  permissionPattern: string;
  conditions?: readonly PluginManifestSecurityPolicyCondition[];
}

export function definePolicyRule(input: DefinePolicyRuleInput): PluginManifestSecurityPolicyRule {
  return {
    roleCode: input.roleCode.trim().toLowerCase(),
    effect: input.effect ?? "allow",
    permissionPattern: input.permissionPattern.trim().toLowerCase(),
    ...(input.conditions !== undefined ? { conditions: [...input.conditions] } : {})
  };
}

export function defineSecurity(input: PluginManifestSecurity): PluginManifestSecurity {
  const permissions = omitEmptyArray(input.permissions);
  const roles = omitEmptyArray(input.roles);
  const grants = omitEmptyArray(input.grants);
  const policyRules = omitEmptyArray(input.policyRules);

  return {
    ...(permissions !== undefined ? { permissions } : {}),
    ...(roles !== undefined ? { roles } : {}),
    ...(grants !== undefined ? { grants } : {}),
    ...(policyRules !== undefined ? { policyRules } : {})
  };
}
