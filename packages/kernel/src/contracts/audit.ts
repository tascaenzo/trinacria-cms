/** Redacted operational audit; appending never accepts arbitrary payloads or secrets. */
export interface AuditEntry {
  id: string;
  timestamp: string;
  instanceId: string;
  actorKind: "user" | "plugin" | "system";
  actorId: string;
  ownerPluginId: string;
  action: string;
  resourceId: string;
  outcome: "allowed" | "denied" | "failed";
  reason: string;
  correlationId?: string;
  revision?: number;
  epoch?: number;
}
export interface AuditSink {
  append(entry: Omit<AuditEntry, "id" | "timestamp">): Promise<void>;
}
