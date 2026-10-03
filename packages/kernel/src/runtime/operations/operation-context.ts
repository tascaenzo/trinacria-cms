import { randomUUID } from "node:crypto";
import type { OperationContext, OperationTarget } from "../../contracts/operations.js";
import { CoreError } from "../../errors/core-error.js";

const contexts = new WeakSet<object>();
const systemScopes = new WeakMap<object, readonly OperationTarget[]>();
const httpContexts = new WeakMap<object, OperationContext>();
function validId(value: string) {
  return (
    typeof value === "string" && value.length > 0 && value.length <= 240 && value === value.trim()
  );
}
function mint(context: OperationContext): OperationContext {
  if (!validId(context.requestId)) throw operationForbidden("invalid_context");
  Object.freeze(context.actor);
  if (context.delegation) Object.freeze(context.delegation);
  const result = Object.freeze(context);
  contexts.add(result);
  return result;
}
export function createUserOperationContext(
  subjectId: string,
  requestId: string = randomUUID(),
  source: "http" | "cli" = "http"
): OperationContext {
  if (!validId(subjectId)) throw operationForbidden("invalid_context");
  return mint({ actor: { kind: "user", subjectId }, source, requestId });
}
export function createPluginOperationContext(
  pluginId: string,
  source: "plugin" | "job" | "http" = "plugin",
  requestId: string = randomUUID(),
  operation?: string
): OperationContext {
  if (!/^[a-z0-9][a-z0-9._/-]*$/.test(pluginId)) throw operationForbidden("invalid_context");
  return mint({
    actor: { kind: "plugin", pluginId },
    source,
    requestId,
    ...(operation ? { operation } : {})
  });
}
/** Host delegation requires a previously authenticated user context, never a userId body. */
export function createDelegatedPluginOperationContext(
  pluginId: string,
  user: OperationContext
): OperationContext {
  assertOperationContext(user);
  if (user.actor.kind !== "user") throw operationForbidden("invalid_delegation");
  const plugin = createPluginOperationContext(pluginId);
  return mint({
    ...plugin,
    delegation: { userId: user.actor.subjectId },
    requestId: user.requestId
  });
}
export function createSystemOperationContext(
  purpose:
    | "manifest-provisioning"
    | "plugin-bootstrap"
    | "migration"
    | "media-cleanup"
    | "secure-email-delivery"
    | "public-delivery",
  targets: readonly OperationTarget[],
  requestId: string = randomUUID()
): OperationContext {
  if (
    !targets.length ||
    ![
      "manifest-provisioning",
      "plugin-bootstrap",
      "migration",
      "media-cleanup",
      "secure-email-delivery",
      "public-delivery"
    ].includes(purpose)
  )
    throw operationForbidden("invalid_system_scope");
  const context = mint({ actor: { kind: "system", purpose }, source: "cli", requestId });
  systemScopes.set(context, Object.freeze(targets.map((target) => Object.freeze({ ...target }))));
  return context;
}
export function assertOperationContext(context: OperationContext): void {
  if (!context || !contexts.has(context)) throw operationForbidden("untrusted_context");
}
export function systemOperationAllowed(
  context: OperationContext,
  target: OperationTarget
): boolean {
  assertOperationContext(context);
  return (systemScopes.get(context) ?? []).some(
    (scope) =>
      scope.ownerPluginId === target.ownerPluginId &&
      scope.resource === target.resource &&
      scope.action === target.action &&
      (scope.resourceId === undefined || scope.resourceId === target.resourceId)
  );
}
export function operationSubjectId(context: OperationContext): string {
  assertOperationContext(context);
  if (context.delegation) return context.delegation.userId;
  if (context.actor.kind === "user") return context.actor.subjectId;
  if (context.actor.kind === "plugin") return `plugin:${context.actor.pluginId}`;
  return `system:${context.actor.purpose}`;
}
export function bindHttpOperationContext(http: object, context: OperationContext): void {
  assertOperationContext(context);
  httpContexts.set(http, context);
}
export function getHttpOperationContext(http: object): OperationContext {
  const context = httpContexts.get(http);
  if (!context) throw operationForbidden("principal_required");
  return context;
}
export function operationForbidden(reason = "permission_denied"): CoreError {
  return new CoreError("operation_forbidden", "Operation is not authorized", {
    details: { reason }
  });
}
