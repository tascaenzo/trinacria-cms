import { createToken } from "@trinacria/core";
import type { ApplicationOperations, OperationAuthorizer } from "../../contracts/operations.js";
import type { KernelSystemService } from "../system/kernel-system-service.js";
import { createApplicationOperations } from "./application-operations.js";
import { operationForbidden, operationSubjectId } from "./operation-context.js";
export type KernelSystemOperations = ApplicationOperations<
  Pick<
    KernelSystemService,
    | "listInstalledPlugins"
    | "listCapabilities"
    | "listPluginContributions"
    | "listAdminExtensions"
    | "listPluginSources"
    | "getInstalledPlugin"
    | "executeOperation"
    | "listPluginEvents"
    | "getPluginOperation"
  >
>;
export const KERNEL_SYSTEM_OPERATIONS = createToken<KernelSystemOperations>(
  "KERNEL_SYSTEM_OPERATIONS"
);
export function createKernelSystemOperations(
  system: KernelSystemService,
  authorizer: OperationAuthorizer
): KernelSystemOperations {
  const discovery = { ownerPluginId: "core-pack", resource: "backoffice", action: "access" };
  const read = { ownerPluginId: "core-pack", resource: "plugins", action: "read" };
  return createApplicationOperations(system, authorizer, {
    listInstalledPlugins: { target: discovery },
    listCapabilities: { target: discovery },
    listPluginContributions: { target: discovery },
    listAdminExtensions: { target: discovery },
    listPluginSources: { target: read },
    getInstalledPlugin: { target: (args) => ({ ...read, resourceId: args[0] as string }) },
    listPluginEvents: { target: (args) => ({ ...read, resourceId: args[0] as string }) },
    getPluginOperation: { target: read },
    executeOperation: {
      target: (args) => ({ ...read, action: "manage", resourceId: args[0] as string }),
      prepare: (args, context) => {
        if (context.actor.kind !== "user") throw operationForbidden("user_required");
        return [args[0], args[1], operationSubjectId(context)];
      }
    }
  });
}
