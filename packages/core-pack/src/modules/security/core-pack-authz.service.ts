import type {
  AuthorizationRequest,
  AuthorizationResult,
  AuthzService,
} from "@trinacria-cms/kernel";
import { CoreError, matchesPermissionPattern } from "@trinacria-cms/kernel";
import { ApiKeysService } from "./api-keys/api-keys.service.js";
import { type AuthorizationRule } from "./authz-rules.js";
import { UserAccessService } from "./user-access/user-access.service.js";

/**
 * Authz service implementation backed by user-role assignments and role grants.
 */
export class CorePackAuthzService implements AuthzService {
  constructor(
    private readonly access: UserAccessService,
    private readonly apiKeys?: ApiKeysService,
  ) {}

  async can(request: AuthorizationRequest): Promise<AuthorizationResult> {
    const permissionKey = this.toPermissionKey(request);
    const rules = await this.resolveRules(request.subjectId);
    if (rules.length === 0) {
      return {
        allowed: false,
        reason: `No authorization rules found for subject "${request.subjectId}"`,
      };
    }

    const matchingDenies = rules.filter(
      (rule) =>
        rule.effect === "deny" &&
        matchesPermissionPattern(rule.permissionPattern, permissionKey) &&
        this.conditionsSatisfied(rule, request),
    );
    if (matchingDenies.length > 0) {
      return {
        allowed: false,
        reason: `Denied by rule "${matchingDenies[0]!.permissionPattern}"`,
      };
    }

    const matchingAllows = rules.filter(
      (rule) =>
        rule.effect === "allow" &&
        matchesPermissionPattern(rule.permissionPattern, permissionKey) &&
        this.conditionsSatisfied(rule, request),
    );
    const allowed = matchingAllows.length > 0;

    return {
      allowed,
      reason: allowed
        ? undefined
        : `Missing permission "${permissionKey}" for subject "${request.subjectId}"`,
    };
  }

  async assert(request: AuthorizationRequest): Promise<void> {
    const decision = await this.can(request);
    if (decision.allowed) return;

    throw new CoreError(
      "AUTHZ_FORBIDDEN",
      decision.reason ?? "Unauthorized request",
      {
        details: {
          subjectId: request.subjectId,
          resource: request.resource,
          action: request.action,
          pluginId: request.context.pluginId,
        },
      },
    );
  }

  private toPermissionKey(request: AuthorizationRequest): string {
    const pluginId = request.context.pluginId.trim().toLowerCase();
    const resource = request.resource.trim().toLowerCase();
    const action = request.action.trim().toLowerCase();
    return `${pluginId}:${resource}:${action}`;
  }

  private conditionsSatisfied(
    rule: AuthorizationRule,
    request: AuthorizationRequest,
  ): boolean {
    for (const condition of rule.conditions) {
      if (condition === "resource_id_required") {
        if (!request.resourceId || request.resourceId.trim().length === 0) {
          return false;
        }
        continue;
      }

      if (condition === "resource_id_equals_subject") {
        if (!request.resourceId || request.resourceId.trim().length === 0) {
          return false;
        }
        if (request.resourceId.trim() !== request.subjectId.trim()) {
          return false;
        }
      }
    }
    return true;
  }

  private async resolveRules(subjectId: string): Promise<readonly AuthorizationRule[]> {
    if (this.apiKeys && this.apiKeys.isApiKeySubject(subjectId)) {
      return this.apiKeys.resolveAuthorizationRules(
        this.apiKeys.toApiKeyId(subjectId),
      );
    }

    return this.access.resolveUserAuthorizationRules(subjectId);
  }
}
