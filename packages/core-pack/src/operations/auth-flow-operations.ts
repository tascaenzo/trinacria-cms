import { createToken } from "@trinacria-cms/kernel";
import type { ApplicationOperations, OperationAuthorizer } from "@trinacria-cms/kernel/contracts";
import { createApplicationOperations } from "@trinacria-cms/kernel/runtime";
import type { AuthUserFlowsService } from "../modules/auth/services/auth-user-flows.service.js";
export type AuthFlowOperations = ApplicationOperations<
  Pick<AuthUserFlowsService, "sendUserInvite">
>;
export const AUTH_FLOW_OPERATIONS = createToken<AuthFlowOperations>("AUTH_FLOW_OPERATIONS");
export function createAuthFlowOperations(
  service: AuthUserFlowsService,
  authorizer: OperationAuthorizer
): AuthFlowOperations {
  return createApplicationOperations(service, authorizer, {
    sendUserInvite: { target: { ownerPluginId: "core-pack", resource: "users", action: "write" } }
  });
}
