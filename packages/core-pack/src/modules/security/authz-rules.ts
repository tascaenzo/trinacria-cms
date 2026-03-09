/**
 * Common authorization rule shape shared by user-based and API-key-based
 * subjects before evaluation inside the AuthzService.
 */
export interface AuthorizationRule {
  effect: "allow" | "deny";
  permissionPattern: string;
  conditions: readonly ("resource_id_required" | "resource_id_equals_subject")[];
}

/**
 * Dedupe helper so multiple sources (direct grants, roles, policy rules)
 * collapse into a stable set of authorization rules.
 */
export function dedupeAuthorizationRules(
  rules: readonly AuthorizationRule[],
): readonly AuthorizationRule[] {
  const unique = new Map<string, AuthorizationRule>();

  for (const rule of rules) {
    const key = `${rule.effect}|${rule.permissionPattern}|${rule.conditions.join(",")}`;
    unique.set(key, rule);
  }

  return [...unique.values()];
}
