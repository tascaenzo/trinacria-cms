import type {
  AuthorizationRequest,
  AuthorizationResult,
  AuthzService
} from "@trinacria-cms/kernel";
import { CoreError } from "@trinacria-cms/kernel";
import { type AuthorizationRule, isPermissionAllowed } from "../policies/authz-rules.js";
import type { UserAccessService } from "../user-access/user-access.service.js";

/**
 * Authz service implementation backed by user-role assignments and role grants.
 */
export class CorePackAuthzService implements AuthzService {
  constructor(private readonly access: UserAccessService) {}

  async can(request: AuthorizationRequest): Promise<AuthorizationResult> {
    const permissionKey = this.toPermissionKey(request);
    if (!(await this.access.isPermissionActive(permissionKey))) {
      return { allowed: false, reason: `Permission "${permissionKey}" is missing or disabled` };
    }
    const rules = await this.resolveRules(request.subjectId);
    if (rules.length === 0) {
      return {
        allowed: false,
        reason: `No authorization rules found for subject "${request.subjectId}"`
      };
    }

    const allowed = isPermissionAllowed(
      rules,
      permissionKey,
      request.subjectId,
      request.resourceId
    );

    return {
      allowed,
      reason: allowed
        ? undefined
        : `Missing permission "${permissionKey}" for subject "${request.subjectId}"`
    };
  }

  async assert(request: AuthorizationRequest): Promise<void> {
    const decision = await this.can(request);
    if (decision.allowed) return;

    throw new CoreError("AUTHZ_FORBIDDEN", decision.reason ?? "Unauthorized request", {
      details: {
        subjectId: request.subjectId,
        resource: request.resource,
        action: request.action,
        pluginId: request.context.pluginId
      }
    });
  }

  private toPermissionKey(request: AuthorizationRequest): string {
    const pluginId = request.context.pluginId.trim().toLowerCase();
    const resource = request.resource.trim().toLowerCase();
    const action = request.action.trim().toLowerCase();
    return `${pluginId}:${resource}:${action}`;
  }

  private async resolveRules(subjectId: string): Promise<readonly AuthorizationRule[]> {
    return this.access.resolveUserAuthorizationRules(subjectId);
  }
}
