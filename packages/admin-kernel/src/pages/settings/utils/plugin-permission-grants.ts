export interface PluginAccessGrantDraft {
  id?: string;
  accessType?: string;
  producerPluginId: string;
  consumerPluginId: string;
  eventName: string;
  payloadType?: string;
  requiredPermission: string;
  status: "pending" | "approved" | "denied" | "revoked";
  reason?: string;
  approvedBy?: string;
  approvedAt?: string;
  updatedAt?: string;
}

export function parsePluginAccessGrantDrafts(value: string): PluginAccessGrantDraft[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const record = item as Record<string, unknown>;
      const status = readGrantStatus(record.status);
      const producerPluginId = readString(record.producerPluginId);
      const consumerPluginId = readString(record.consumerPluginId);
      const eventName = readString(record.eventName);
      const requiredPermission = readString(record.requiredPermission);
      if (!status || !producerPluginId || !consumerPluginId || !eventName || !requiredPermission) {
        return [];
      }
      return [
        {
          id: readOptionalString(record.id),
          accessType: readOptionalString(record.accessType),
          producerPluginId,
          consumerPluginId,
          eventName,
          payloadType: readOptionalString(record.payloadType),
          requiredPermission,
          status,
          reason: readOptionalString(record.reason),
          approvedBy: readOptionalString(record.approvedBy),
          approvedAt: readOptionalString(record.approvedAt),
          updatedAt: readOptionalString(record.updatedAt)
        }
      ];
    });
  } catch {
    return [];
  }
}

export function getPluginGrantId(grant: PluginAccessGrantDraft): string {
  return (
    grant.id ??
    [
      grant.accessType ?? "access",
      grant.producerPluginId,
      grant.consumerPluginId,
      grant.eventName,
      grant.payloadType ?? "*",
      grant.requiredPermission
    ]
      .map((value) => value.trim().toLowerCase())
      .join("|")
  );
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readGrantStatus(value: unknown): PluginAccessGrantDraft["status"] | undefined {
  if (value === "pending" || value === "approved" || value === "denied" || value === "revoked") {
    return value;
  }
  return undefined;
}
