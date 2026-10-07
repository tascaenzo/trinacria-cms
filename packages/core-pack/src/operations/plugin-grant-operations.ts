import { createToken, type OperationAuthorizer } from "@trinacria-cms/kernel";
import {
  createApplicationOperations,
  operationForbidden,
  operationSubjectId
} from "@trinacria-cms/kernel/runtime";
import type { PluginGrantsRepository } from "../modules/settings/plugin-access/plugin-grants.repository.js";
export type PluginGrantOperations = ReturnType<typeof createPluginGrantOperations>;
export const PLUGIN_GRANT_OPERATIONS =
  createToken<PluginGrantOperations>("PLUGIN_GRANT_OPERATIONS");
export function createPluginGrantOperations(
  repository: PluginGrantsRepository,
  authorizer: OperationAuthorizer
) {
  return createApplicationOperations(repository, authorizer, {
    list: { target: { ownerPluginId: "core-pack", resource: "plugin-grants", action: "read" } },
    get: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "plugin-grants",
        action: "read",
        resourceId: args[0] as string
      })
    },
    decide: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "plugin-grants",
        action: "manage",
        resourceId: args[0] as string
      }),
      prepare: (args, context) => {
        if (context.actor.kind !== "user") throw operationForbidden("user_required");
        return [args[0], args[1], args[2], operationSubjectId(context), args[4]];
      }
    }
  });
}
