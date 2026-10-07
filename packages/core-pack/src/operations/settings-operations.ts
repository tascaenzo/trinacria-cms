import { createToken } from "@trinacria-cms/kernel";
import type {
  ApplicationOperations,
  OperationAuthorizer,
  OperationContext
} from "@trinacria-cms/kernel/contracts";
import {
  createApplicationOperations,
  operationForbidden,
  operationSubjectId
} from "@trinacria-cms/kernel/runtime";
import type { SettingsService } from "../modules/settings/services/settings.service.js";

type Methods =
  | "listGroups"
  | "listGroupsForPlugin"
  | "getGroupById"
  | "getGroupForPlugin"
  | "upsertGroupValues"
  | "listDefinitions"
  | "listDefinitionsForPlugin"
  | "getDefinitionByKey"
  | "getDefinitionByKeyForPlugin"
  | "upsertDefinition"
  | "getResolvedValueByKey"
  | "getResolvedValueForPlugin"
  | "upsertValue"
  | "getSecretMetadataByKey"
  | "getSecretMetadata"
  | "upsertSecret"
  | "revealSecret"
  | "exportPluginSettings"
  | "getObservabilitySnapshot";
export type SettingsOperations = ApplicationOperations<Pick<SettingsService, Methods>>;
export const SETTINGS_OPERATIONS = createToken<SettingsOperations>("SETTINGS_OPERATIONS");
function requester(context: OperationContext, key?: string): string {
  if (context.actor.kind === "plugin") return context.actor.pluginId;
  const owner = key?.trim().toLowerCase().split(":")[0];
  if (!owner) throw operationForbidden("setting_owner_required");
  return owner;
}
export function createSettingsOperations(
  service: SettingsService,
  authorizer: OperationAuthorizer
): SettingsOperations {
  const target = (context: OperationContext, action: string, secret = false, key?: string) => {
    key = key?.trim().toLowerCase();
    return {
      ownerPluginId:
        context.actor.kind === "plugin"
          ? (key?.split(":")[0] ?? context.actor.pluginId)
          : "core-pack",
      resource: secret ? "settings.secrets" : "settings",
      action,
      ...(key ? { resourceId: key } : {})
    };
  };
  const read = {
    target: (_args: readonly unknown[], context: OperationContext) => target(context, "read")
  };
  const ownRead = {
    ...read,
    prepare: (args: readonly unknown[], context: OperationContext) => [
      context.actor.kind === "plugin" ? context.actor.pluginId : args[0],
      ...args.slice(1)
    ]
  };
  const keyedRead = (secret = false, index = 0) => ({
    target: (args: readonly unknown[], context: OperationContext) =>
      target(context, "read", secret, args[index] as string)
  });
  const ownKeyedRead = (secret = false) => ({
    ...keyedRead(secret, 1),
    prepare: (args: readonly unknown[], context: OperationContext) => [
      requester(context, args[1] as string),
      args[1]
    ]
  });
  const write = (secret = false) => ({
    target: (args: readonly unknown[], context: OperationContext) =>
      target(context, "write", secret, (args[0] as { key: string }).key),
    prepare: async (args: readonly unknown[], context: OperationContext) => {
      const original = args[0] as { key: string; value?: unknown; defaultValue?: unknown };
      const input = { ...original, key: original.key.trim().toLowerCase() };
      return [
        {
          ...input,
          requesterPluginId: requester(context, input.key),
          updatedBy: operationSubjectId(context)
        }
      ];
    }
  });
  return createApplicationOperations(service, authorizer, {
    listGroups: {
      ...read,
      invoke: (context, args) =>
        context.actor.kind === "plugin"
          ? service.listGroupsForPlugin(context.actor.pluginId)
          : service.listGroups(args[0] as never)
    },
    listGroupsForPlugin: ownRead,
    getGroupById: {
      ...read,
      invoke: (context, args) =>
        context.actor.kind === "plugin"
          ? service.getGroupForPlugin(context.actor.pluginId, args[0] as string)
          : service.getGroupById(args[0] as string, args[1] as never)
    },
    getGroupForPlugin: ownRead,
    listDefinitions: {
      ...read,
      invoke: (context, args) =>
        context.actor.kind === "plugin"
          ? service.listDefinitionsForPlugin(context.actor.pluginId)
          : service.listDefinitions(args[0] as never)
    },
    listDefinitionsForPlugin: ownRead,
    getDefinitionByKey: {
      ...keyedRead(),
      invoke: (context, args) =>
        context.actor.kind === "plugin"
          ? service.getDefinitionByKeyForPlugin(context.actor.pluginId, args[0] as string)
          : service.getDefinitionByKey(args[0] as string)
    },
    getDefinitionByKeyForPlugin: ownKeyedRead(),
    getResolvedValueByKey: {
      ...keyedRead(),
      invoke: (context, args) =>
        context.actor.kind === "plugin"
          ? service.getResolvedValueForPlugin(context.actor.pluginId, args[0] as string)
          : service.getResolvedValueByKey(args[0] as string)
    },
    getResolvedValueForPlugin: ownKeyedRead(),
    upsertDefinition: write(),
    upsertValue: write(),
    getSecretMetadataByKey: {
      ...keyedRead(true),
      invoke: (context, args) =>
        context.actor.kind === "plugin"
          ? service.getSecretMetadata(context.actor.pluginId, args[0] as string)
          : service.getSecretMetadataByKey(args[0] as string)
    },
    getSecretMetadata: ownKeyedRead(true),
    upsertSecret: write(true),
    revealSecret: ownKeyedRead(true),
    upsertGroupValues: {
      target: (_args, context) => target(context, "write"),
      invoke: async (context, args) => {
        const input = args[0] as Parameters<SettingsService["upsertGroupValues"]>[0];
        const snapshot = await service.getGroupById(
          input.groupId,
          context.actor.kind === "plugin" ? { ownerPluginId: context.actor.pluginId } : undefined
        );
        const values = Object.fromEntries(
          Object.entries(input.values).map(([name, value]) => [name.trim().toLowerCase(), value])
        );
        for (const field of snapshot?.fields ?? []) {
          if (!Object.hasOwn(values, field.fieldId)) continue;
          await authorizer.assert(context, target(context, "write", false, field.key));
        }
        return service.upsertGroupValues({ ...input, values });
      },
      prepare: (args, context) => [
        {
          ...(args[0] as object),
          requesterPluginId: context.actor.kind === "plugin" ? context.actor.pluginId : "core-pack",
          admin: context.actor.kind === "user",
          updatedBy: operationSubjectId(context)
        }
      ]
    },
    exportPluginSettings: ownRead,
    getObservabilitySnapshot: read
  });
}
