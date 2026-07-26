import type {
  PluginAccessAuthorizationResult,
  PluginAccessGrant,
  PluginAccessGrantStatus,
  PluginEventSubscriptionAuthorizationRequest,
  PluginEventSubscriptionAuthorizer,
  SecureEventPayloadAuthorizationRequest,
  SecureEventPayloadAuthorizer
} from "@trinacria-cms/kernel/contracts";
import type { JsonValue } from "../_shared/settings-json.js";
import type { SettingsService } from "../services/settings.service.js";

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
      accessType: "event-subscription",
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
      accessType: "secure-payload-claim",
      producerPluginId: request.payload.producerPluginId,
      consumerPluginId: request.consumerPluginId,
      eventName: request.eventName,
      payloadType: request.payload.payloadType,
      requiredPermission: request.requiredPermission
    });
  }

  async listGrants(): Promise<readonly PluginAccessGrant[]> {
    return this.readGrants();
  }

  async approveGrant(id: string, updatedBy = "backoffice"): Promise<readonly PluginAccessGrant[]> {
    return this.updateGrantStatus(id, "approved", updatedBy);
  }

  async denyGrant(id: string, updatedBy = "backoffice"): Promise<readonly PluginAccessGrant[]> {
    return this.updateGrantStatus(id, "denied", updatedBy);
  }

  async revokeGrant(id: string, updatedBy = "backoffice"): Promise<readonly PluginAccessGrant[]> {
    return this.updateGrantStatus(id, "revoked", updatedBy);
  }

  private async authorize(input: {
    accessType: PluginAccessGrant["accessType"];
    producerPluginId: string;
    consumerPluginId: string;
    eventName: string;
    payloadType?: string;
    requiredPermission: string;
  }): Promise<PluginAccessAuthorizationResult> {
    const grants = await this.readGrants();
    const grant = grants.find((item) => matchesGrant(item, input));
    if (!grant) {
      await this.createPendingGrant(input);
      return { allowed: false, reason: "plugin_access_grant_missing" };
    }
    if (grant.status !== "approved") {
      return { allowed: false, reason: `plugin_access_grant_${grant.status}` };
    }
    return { allowed: true };
  }

  private async createPendingGrant(input: {
    accessType: PluginAccessGrant["accessType"];
    producerPluginId: string;
    consumerPluginId: string;
    eventName: string;
    payloadType?: string;
    requiredPermission: string;
  }): Promise<void> {
    const grants = await this.readGrants();
    const pending: PluginAccessGrant = {
      id: createGrantId(input),
      accessType: input.accessType,
      producerPluginId: normalize(input.producerPluginId),
      consumerPluginId: normalize(input.consumerPluginId),
      eventName: normalize(input.eventName),
      ...(input.payloadType ? { payloadType: normalize(input.payloadType) } : {}),
      requiredPermission: normalize(input.requiredPermission),
      status: "pending",
      reason: "Runtime access request",
      updatedAt: new Date().toISOString()
    };
    if (grants.some((grant) => grant.id === pending.id || matchesGrant(grant, pending))) return;
    await this.writeGrants([...grants, pending]);
  }

  private async updateGrantStatus(
    id: string,
    status: PluginAccessGrantStatus,
    updatedBy: string
  ): Promise<readonly PluginAccessGrant[]> {
    const grants = await this.readGrants();
    const normalizedId = normalize(id);
    const now = new Date().toISOString();
    const updated = grants.map((grant) => {
      const grantId = grant.id ?? createGrantId(grant);
      if (normalize(grantId) !== normalizedId) return { ...grant, id: grantId };
      return {
        ...grant,
        id: grantId,
        status,
        approvedBy: status === "approved" ? updatedBy : grant.approvedBy,
        approvedAt: status === "approved" ? now : grant.approvedAt,
        updatedAt: now
      };
    });
    await this.writeGrants(updated);
    return updated;
  }

  private async readGrants(): Promise<readonly PluginAccessGrant[]> {
    const setting = await this.settings.getResolvedValueByKey(PLUGIN_ACCESS_GRANTS_SETTING_KEY);
    return parsePluginAccessGrants(setting?.value);
  }

  private async writeGrants(grants: readonly PluginAccessGrant[]): Promise<void> {
    await this.settings.upsertValue({
      requesterPluginId: "core-pack",
      key: PLUGIN_ACCESS_GRANTS_SETTING_KEY,
      value: grants.map(toJsonGrant),
      updatedBy: "plugin-access-policy"
    });
  }
}

function toJsonGrant(grant: PluginAccessGrant): Record<string, string> {
  return Object.fromEntries(
    Object.entries({
      id: grant.id,
      accessType: grant.accessType,
      producerPluginId: grant.producerPluginId,
      consumerPluginId: grant.consumerPluginId,
      eventName: grant.eventName,
      payloadType: grant.payloadType,
      requiredPermission: grant.requiredPermission,
      status: grant.status,
      reason: grant.reason,
      approvedBy: grant.approvedBy,
      approvedAt: grant.approvedAt,
      updatedAt: grant.updatedAt
    }).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

function matchesGrant(
  grant: PluginAccessGrant,
  input: {
    accessType?: PluginAccessGrant["accessType"];
    producerPluginId: string;
    consumerPluginId: string;
    eventName: string;
    payloadType?: string;
    requiredPermission: string;
  }
): boolean {
  if (grant.accessType && input.accessType && grant.accessType !== input.accessType) return false;
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
      id: readOptionalString(record.id),
      accessType: readOptionalAccessType(record.accessType),
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
    return [
      { ...grant, id: grant.id ?? createGrantId(grant as PluginAccessGrant) } as PluginAccessGrant
    ];
  });
}

function createGrantId(input: {
  accessType?: string;
  producerPluginId: string;
  consumerPluginId: string;
  eventName: string;
  payloadType?: string;
  requiredPermission: string;
}): string {
  return [
    input.accessType ?? "access",
    input.producerPluginId,
    input.consumerPluginId,
    input.eventName,
    input.payloadType ?? "*",
    input.requiredPermission
  ]
    .map(normalize)
    .join("|");
}

function readString(value: JsonValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function readOptionalString(value: JsonValue | undefined): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readOptionalAccessType(value: JsonValue | undefined): PluginAccessGrant["accessType"] {
  if (
    value === "event-subscription" ||
    value === "secure-payload-claim" ||
    value === "setting" ||
    value === "api"
  ) {
    return value;
  }
  return undefined;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
