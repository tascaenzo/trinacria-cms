import type {
  OperationContext,
  OperationTarget,
  PluginAccessAuthorizationResult,
  PluginEventSubscriptionAuthorizationRequest,
  PluginManifest,
  PluginOperationAuthorizationRequest,
  PluginRuntime,
  SecureEventPayloadAuthorizationRequest
} from "@trinacria-cms/kernel/contracts";
import type { ExternalPluginHttpAccessPolicyService } from "./external-plugin-http-access-policy.service.js";

/** Installed in-process code is trusted. These checks enforce integration contracts, not a sandbox. */
export class TrustedPluginAccessPolicyService {
  constructor(
    private readonly runtime: {
      list(): ReturnType<PluginRuntime["list"]> | Promise<ReturnType<PluginRuntime["list"]>>;
    },
    private readonly externalPolicy: Pick<ExternalPluginHttpAccessPolicyService, "canOperate">
  ) {}

  async canOperate(
    context: OperationContext,
    target: OperationTarget
  ): Promise<PluginAccessAuthorizationResult> {
    if (context.actor.kind !== "plugin") return { allowed: false };
    // A signed HTTP client is not installed code: retain its explicit access grants.
    if (context.source === "http") return this.externalPolicy.canOperate(context, target);
    return this.connection(
      context.actor.pluginId,
      target.ownerPluginId,
      `${target.ownerPluginId}:${target.resource}:${target.action}`
    );
  }

  canInvoke(
    request: PluginOperationAuthorizationRequest
  ): Promise<PluginAccessAuthorizationResult> {
    return this.connection(
      request.callerPluginId,
      request.ownerPluginId,
      request.requiredPermission
    );
  }

  async canSubscribe(
    request: PluginEventSubscriptionAuthorizationRequest
  ): Promise<PluginAccessAuthorizationResult> {
    const records = await this.runtime.list();
    const consumer = records.find((record) => record.manifest.id === request.subscriberPluginId);
    const owner = records.find((record) => record.manifest.id === request.eventOwnerPluginId);
    if (!consumer || !owner || consumer.state === "disabled") return { allowed: false };
    const event = owner.manifest.events?.emits?.find(
      (item) => `${owner.manifest.id}:${item.name}` === request.eventName
    );
    return {
      allowed:
        this.dependsOn(consumer.manifest, owner.manifest.id) &&
        this.permission(owner.manifest, request.requiredPermission) &&
        event?.visibility === request.eventVisibility &&
        (consumer.manifest.events?.subscribes ?? []).some(
          (item) =>
            this.matchesEvent(item.eventName, request.eventName) &&
            item.requiredPermission === request.requiredPermission
        )
    };
  }

  async canClaim(
    request: SecureEventPayloadAuthorizationRequest
  ): Promise<PluginAccessAuthorizationResult> {
    const records = await this.runtime.list();
    const consumer = records.find((record) => record.manifest.id === request.consumerPluginId);
    const owner = records.find((record) => record.manifest.id === request.payload.producerPluginId);
    return {
      allowed:
        !!consumer &&
        !!owner &&
        this.active(consumer.state) &&
        this.active(owner.state) &&
        request.payload.eventName === request.eventName &&
        request.payload.requiredPermission === request.requiredPermission &&
        (!request.payload.authorizedConsumerPluginIds ||
          request.payload.authorizedConsumerPluginIds.includes(request.consumerPluginId)) &&
        (this.permission(owner.manifest, request.requiredPermission) ||
          this.permission(consumer.manifest, request.requiredPermission)) &&
        (owner.manifest.events?.emits ?? []).some(
          (item) => `${owner.manifest.id}:${item.name}` === request.eventName
        ) &&
        (consumer.manifest.events?.subscribes ?? []).some((item) =>
          this.matchesEvent(item.eventName, request.eventName)
        )
    };
  }

  private async connection(
    consumerId: string,
    ownerId: string,
    permission: string
  ): Promise<PluginAccessAuthorizationResult> {
    const records = await this.runtime.list();
    const consumer = records.find((record) => record.manifest.id === consumerId);
    const owner = records.find((record) => record.manifest.id === ownerId);
    return {
      allowed:
        !!consumer &&
        !!owner &&
        this.active(consumer.state) &&
        this.active(owner.state) &&
        this.dependsOn(consumer.manifest, ownerId) &&
        this.permission(owner.manifest, permission)
    };
  }
  private active(state: string): boolean {
    return ["loading", "initializing", "loaded"].includes(state);
  }
  private dependsOn(manifest: PluginManifest, ownerId: string): boolean {
    return (
      manifest.id === ownerId || !!manifest.dependencies?.some((item) => item.pluginId === ownerId)
    );
  }
  private permission(manifest: PluginManifest, key: string): boolean {
    return (
      key.startsWith(`${manifest.id}:`) &&
      !!manifest.security?.permissions?.some((item) => item.key === key)
    );
  }
  private matchesEvent(pattern: string, eventName: string): boolean {
    return (
      pattern === eventName ||
      (pattern.startsWith("*:") && pattern.slice(1) === eventName.slice(eventName.indexOf(":")))
    );
  }
}
