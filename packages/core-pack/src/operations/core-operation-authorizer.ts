import type {
  AuditSink,
  AuthzService,
  OperationAuthorizer,
  OperationContext,
  OperationTarget
} from "@trinacria-cms/kernel/contracts";
import {
  assertOperationContext,
  operationForbidden,
  systemOperationAllowed
} from "@trinacria-cms/kernel/runtime";

/** Installed-plugin contracts and external HTTP access decisions. */
export interface PluginApplicationGrantPolicy {
  canOperate(context: OperationContext, target: OperationTarget): Promise<{ allowed: boolean }>;
}
export class CoreOperationAuthorizer implements OperationAuthorizer {
  constructor(
    private readonly authz: AuthzService,
    private readonly pluginGrants?: PluginApplicationGrantPolicy,
    private readonly audit?: AuditSink
  ) {}
  readonly metrics = { denials: 0, auditFailures: 0 };
  async run<T>(
    context: OperationContext,
    targets: readonly OperationTarget[],
    work: () => Promise<T>
  ): Promise<T> {
    assertOperationContext(context);
    for (const target of targets) await this.assert(context, target);
    return work();
  }
  async assert(context: OperationContext, target: OperationTarget): Promise<void> {
    assertOperationContext(context);
    try {
      await this.check(context, target);
    } catch (error) {
      this.metrics.denials++;
      const actor = context.actor;
      try {
        await this.audit?.append({
          instanceId: "operation-policy",
          actorKind: actor.kind,
          actorId:
            actor.kind === "user"
              ? actor.subjectId
              : actor.kind === "plugin"
                ? actor.pluginId
                : actor.purpose,
          ownerPluginId: target.ownerPluginId,
          action: `${target.resource}.${target.action}`,
          resourceId: target.resourceId ?? target.resource,
          outcome: "denied",
          reason: "operation-denied",
          correlationId: context.requestId
        });
      } catch {
        this.metrics.auditFailures++;
      }
      throw error;
    }
  }
  private async check(context: OperationContext, target: OperationTarget): Promise<void> {
    assertOperationContext(context);
    if (
      !/^[a-z0-9][a-z0-9._/-]*$/.test(target.ownerPluginId) ||
      !/^[a-z0-9][a-z0-9._/-]*$/.test(target.resource) ||
      !/^[a-z0-9][a-z0-9._/-]*$/.test(target.action)
    )
      throw operationForbidden("invalid_target");
    if (context.actor.kind === "system") {
      if (!systemOperationAllowed(context, target)) throw operationForbidden("system_scope_denied");
      return;
    }
    if (context.actor.kind === "plugin") {
      if (!this.pluginGrants) throw operationForbidden("plugin_grant_required");
      let allowed = false;
      try {
        allowed = (await this.pluginGrants.canOperate(context, target))?.allowed === true;
      } catch {
        throw operationForbidden("policy_error");
      }
      if (!allowed) throw operationForbidden("plugin_grant_denied");
    }
    const subjectId =
      context.actor.kind === "user" ? context.actor.subjectId : context.delegation?.userId;
    if (subjectId) {
      let allowed = false;
      try {
        allowed =
          (
            await this.authz.can({
              subjectId,
              resource: target.resource,
              action: target.action,
              resourceId: target.resourceId,
              context: { pluginId: target.ownerPluginId }
            })
          )?.allowed === true;
      } catch {
        throw operationForbidden("policy_error");
      }
      if (!allowed) throw operationForbidden("user_permission_denied");
    }
  }
}
