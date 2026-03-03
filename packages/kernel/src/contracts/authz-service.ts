import type { NamespaceContext } from "./namespace-context.js";

/**
 * Uniform authorization request used by core and plugins.
 * Checks always run inside an explicit namespace.
 */
export interface AuthorizationRequest {
  /** Identifier of the user/service attempting the action. */
  subjectId: string;
  /** Requested action (e.g. "create", "read", "publish"). */
  action: string;
  /** Logical resource targeted by the policy (e.g. "content.entry"). */
  resource: string;
  /** Optional target resource ID for object-level policies. */
  resourceId?: string;
  /** Plugin/workspace context for tenant-aware policies. */
  context: NamespaceContext;
}

/**
 * Formal result of policy evaluation.
 */
export interface AuthorizationResult {
  /** True when the request is authorized. */
  allowed: boolean;
  /** Optional reason useful for logging/audit/policy debugging. */
  reason?: string;
}

/**
 * Kernel AuthZ contract.
 * `can` returns the decision; `assert` throws when unauthorized.
 */
export interface AuthzService {
  can(request: AuthorizationRequest): Promise<AuthorizationResult>;
  assert(request: AuthorizationRequest): Promise<void>;
}
