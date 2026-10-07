/**
 * Common authorization rule shape shared by user-based and API-key-based
 * subjects before evaluation inside the AuthzService.
 */
import { matchesPermissionPattern } from "@trinacria-cms/kernel/runtime";

export interface AuthorizationRule {
  effect: "allow" | "deny";
  permissionPattern: string;
  conditions: readonly ("resource_id_required" | "resource_id_equals_subject")[];
}

/** One evaluator for operation enforcement and contextual UI decisions. */
export function isPermissionAllowed(
  rules: readonly AuthorizationRule[],
  permissionKey: string,
  subjectId: string,
  resourceId?: string
): boolean {
  const matches = (rule: AuthorizationRule) =>
    matchesPermissionPattern(rule.permissionPattern, permissionKey) &&
    rule.conditions.every((condition) => {
      if (condition === "resource_id_required") return Boolean(resourceId?.trim());
      if (condition === "resource_id_equals_subject")
        return resourceId?.trim() === subjectId.trim();
      return false;
    });
  return (
    !rules.some((rule) => rule.effect === "deny" && matches(rule)) &&
    rules.some((rule) => rule.effect === "allow" && matches(rule))
  );
}

/**
 * Dedupe helper so multiple sources (direct grants, roles, policy rules)
 * collapse into a stable set of authorization rules.
 */
export function dedupeAuthorizationRules(
  rules: readonly AuthorizationRule[]
): readonly AuthorizationRule[] {
  const unique = new Map<string, AuthorizationRule>();

  for (const rule of rules) {
    const key = `${rule.effect}|${rule.permissionPattern}|${rule.conditions.join(",")}`;
    unique.set(key, rule);
  }

  return [...unique.values()];
}
