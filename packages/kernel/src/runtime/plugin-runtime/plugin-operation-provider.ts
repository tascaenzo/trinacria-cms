import {
  createProviderKind,
  type DependencyList,
  factoryProvider,
  type Token
} from "@trinacria/core";
import type { Schema } from "@trinacria/schema";
import type { OperationContext } from "../../contracts/operations.js";
import type { PluginEventPublisher } from "../../contracts/plugin-runtime.js";

export interface PluginOperationDefinition {
  name: string;
  private?: boolean;
  requiredPermission?: string;
  input: Schema<unknown>;
  invoke(
    input: unknown,
    context: {
      operationContext: OperationContext;
      callerPluginId: string;
      ownerPluginId: string;
      events: PluginEventPublisher;
      signal?: AbortSignal;
    }
  ): Promise<unknown> | unknown;
}
export interface PluginOperationsProvider {
  ownerPluginId: string;
  operations: readonly PluginOperationDefinition[];
}
export const PLUGIN_OPERATIONS_PROVIDER_KIND =
  createProviderKind<PluginOperationsProvider>("CMS_PLUGIN_OPERATIONS");

/** Module composition helper. Dependencies are resolved by the host, never by a plugin context. */
export function pluginOperationsProvider<TDependencies extends unknown[]>(
  token: Token<PluginOperationsProvider>,
  ownerPluginId: string,
  factory: (...dependencies: TDependencies) => readonly PluginOperationDefinition[],
  deps: DependencyList = []
) {
  return {
    ...factoryProvider(
      token,
      (...dependencies: TDependencies) => ({ ownerPluginId, operations: factory(...dependencies) }),
      deps
    ),
    kind: PLUGIN_OPERATIONS_PROVIDER_KIND
  };
}
