import type {
  PluginAccessAuthorizationResult,
  PluginAccessGrant,
  PluginEventSubscriptionAuthorizationRequest,
  PluginEventSubscriptionAuthorizer,
  SecureEventPayloadAuthorizationRequest,
  SecureEventPayloadAuthorizer
} from "@trinacria-cms/kernel/contracts";
import type { JsonValue } from "./_shared/settings-json.js";
import { SettingsService } from "./settings.service.js";

export const PLUGIN_ACCESS_GRANTS_SETTING_KEY = "core-pack:security:plugin_access_grants";

/**
 * Settings-backed plugin access policy used as the CMS permission center.
 * The manifest declares the need; this service applies the admin decision.
 */
export class SettingsPluginAccessPolicyService
  implements PluginEventSubscriptionAuthorizer, SecureEventPayloadAuthorizer
{
  constructor(private readonly settings: SettingsService) {}

  async canSubscribe(
    request: PluginEventSubscriptionAuthorizationRequest
  ): Promise<PluginAccessAuthorizationResult> {
    return this.authorize({
      producerPluginId: request.eventOwnerPluginId,
      consumerPluginId: request.subscriberPluginId,
      eventName: request.eventName,
      requiredPermission: request.requiredPermission
    });
  }

  async canClaim(
    request: SecureEventPayloadAuthorizationRequest
  ): Promise<PluginAccessAuthorizationResult> {
    if (request.decision === "deny") {
      return { allowed: false, reason: request.reason };
    }

    return this.authorize({
      producerPluginId: request.payload.producerPluginId,
      consumerPluginId: request.consumerPluginId,
      eventName: request.eventName,
      payloadType: request.payload.payloadType,
      requiredPermission: request.requiredPermission
    });
  }

  private async authorize(input: {
    producerPluginId: string;
    consumerPluginId: string;
    eventName: string;
    payloadType?: string;
    requiredPermission: string;
  }): Promise<PluginAccessAuthorizationResult> {
    const grants = await this.readGrants();
    const grant = grants.find((item) => matchesGrant(item, input));
    if (!grant) {
      return { allowed: false, reason: "plugin_access_grant_missing" };
    }
    if (grant.status !== "approved") {
      return { allowed: false, reason: `plugin_access_grant_${grant.status}` };
    }
    return { allowed: true };
  }

  private async readGrants(): Promise<readonly PluginAccessGrant[]> {
    const setting = await this.settings.getResolvedValueByKey(PLUGIN_ACCESS_GRANTS_SETTING_KEY);
    return parsePluginAccessGrants(setting?.value);
  }
}

function matchesGrant(
  grant: PluginAccessGrant,
  input: {
    producerPluginId: string;
    consumerPluginId: string;
    eventName: string;
    payloadType?: string;
    requiredPermission: string;
  }
): boolean {
  if (normalize(grant.producerPluginId) !== normalize(input.producerPluginId)) return false;
  if (normalize(grant.consumerPluginId) !== normalize(input.consumerPluginId)) return false;
  if (normalize(grant.eventName) !== normalize(input.eventName)) return false;
  if (normalize(grant.requiredPermission) !== normalize(input.requiredPermission)) return false;
  if (grant.payloadType && input.payloadType) {
    return normalize(grant.payloadType) === normalize(input.payloadType);
  }
  return !grant.payloadType || !input.payloadType;
}

function parsePluginAccessGrants(value: JsonValue | undefined): readonly PluginAccessGrant[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, JsonValue>;
    const status = typeof record.status === "string" ? record.status : "";
    if (!["pending", "approved", "denied", "revoked"].includes(status)) return [];
    const grant = {
      producerPluginId: readString(record.producerPluginId),
      consumerPluginId: readString(record.consumerPluginId),
      eventName: readString(record.eventName),
      payloadType: readOptionalString(record.payloadType),
      requiredPermission: readString(record.requiredPermission),
      status,
      reason: readOptionalString(record.reason),
      approvedBy: readOptionalString(record.approvedBy),
      approvedAt: readOptionalString(record.approvedAt),
      updatedAt: readOptionalString(record.updatedAt)
    };
    if (
      !grant.producerPluginId ||
      !grant.consumerPluginId ||
      !grant.eventName ||
      !grant.requiredPermission
    ) {
      return [];
    }
    return [grant as PluginAccessGrant];
  });
}

function readString(value: JsonValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function readOptionalString(value: JsonValue | undefined): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
