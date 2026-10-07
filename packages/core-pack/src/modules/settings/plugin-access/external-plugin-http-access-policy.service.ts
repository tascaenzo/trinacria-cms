import type {
  OperationContext,
  OperationTarget,
  PluginAccessAuthorizationResult
} from "@trinacria-cms/kernel/contracts";
import type { PluginGrantIdentity, PluginGrantsRepository } from "./plugin-grants.repository.js";

/** Explicit access decisions for authenticated external HTTP clients only. */
export class ExternalPluginHttpAccessPolicyService {
  constructor(private readonly grants: PluginGrantsRepository) {}
  async canOperate(
    context: OperationContext,
    target: OperationTarget
  ): Promise<PluginAccessAuthorizationResult> {
    if (context.actor.kind !== "plugin" || context.source !== "http") return { allowed: false };
    const identity: PluginGrantIdentity = {
      accessType: "api",
      producerPluginId: target.ownerPluginId,
      consumerPluginId: context.actor.pluginId,
      resource: target.resource,
      action: target.action,
      requiredPermission: `${target.ownerPluginId}:${target.resource}:${target.action}`
    };
    if (context.operation) {
      const bound = await this.grants.find({ ...identity, operation: context.operation });
      if (bound)
        return {
          allowed: bound.status === "approved",
          reason: `plugin_access_grant_${bound.status}`
        };
    }
    return this.authorize(identity);
  }
  private async authorize(input: PluginGrantIdentity): Promise<PluginAccessAuthorizationResult> {
    const grant = await this.grants.find(input);
    if (!grant) {
      await this.grants.request(input);
      return { allowed: false, reason: "plugin_access_grant_missing" };
    }
    return grant.status === "approved"
      ? { allowed: true }
      : { allowed: false, reason: `plugin_access_grant_${grant.status}` };
  }
}
