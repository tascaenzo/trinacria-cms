import { randomUUID } from "node:crypto";
import { type AuditEntry, type AuditSink, type DbAdapter, s } from "@trinacria-cms/kernel";
import { defineEntity } from "@trinacria-cms/kernel/runtime";
export const SECURITY_AUDIT_ENTITY = defineEntity({
  ownerPluginId: "core-pack",
  entityName: "security_audit",
  schema: s.object({}, { strict: false }),
  indexes: [
    { fields: { id: 1 }, unique: true, name: "security_audit_id" },
    { fields: { expiresAt: 1 }, expireAfterSeconds: 0, name: "security_audit_expiry" },
    { fields: { ownerPluginId: 1, timestamp: -1 }, name: "security_audit_owner_time" },
    { fields: { actorId: 1, timestamp: -1 }, name: "security_audit_actor_time" }
  ]
});
export class SecurityAuditStore implements AuditSink {
  constructor(
    private readonly db: DbAdapter,
    private readonly retentionDays = 90,
    private readonly includePlatform = false
  ) {
    if (!Number.isSafeInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650)
      throw new Error("Invalid audit retention");
  }
  async append(input: Omit<AuditEntry, "id" | "timestamp">): Promise<void> {
    await this.appendIn(this.db, input);
  }
  async appendIn(db: DbAdapter, input: Omit<AuditEntry, "id" | "timestamp">): Promise<void> {
    // Copy the allowlist: extra input properties (body/token/diff) cannot enter storage.
    const {
      instanceId,
      actorKind,
      actorId,
      ownerPluginId,
      action,
      resourceId,
      outcome,
      reason,
      correlationId,
      revision,
      epoch
    } = input;
    for (const value of [instanceId, actorId, ownerPluginId, action, resourceId, reason])
      if (typeof value !== "string" || value.length > 500 || /[\r\n\0]/.test(value))
        throw new Error("Invalid audit field");
    const now = Date.now();
    await db.repository("security_audit", { pluginId: "core-pack" }).insertOne({
      id: randomUUID(),
      timestamp: new Date(now).toISOString(),
      instanceId,
      actorKind,
      actorId,
      ownerPluginId,
      action,
      resourceId,
      outcome,
      reason,
      ...(correlationId ? { correlationId } : {}),
      ...(revision !== undefined ? { revision } : {}),
      ...(epoch !== undefined ? { epoch } : {}),
      expiresAt: new Date(now + this.retentionDays * 86400000)
    });
  }
  async list(
    input: {
      ownerPluginId?: string;
      actorId?: string;
      since?: string;
      until?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<readonly AuditEntry[]> {
    const limit = input.limit ?? 100,
      offset = input.offset ?? 0;
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 10000
    )
      throw new Error("Invalid audit pagination");
    for (const value of [input.since, input.until])
      if (value && !Number.isFinite(Date.parse(value)))
        throw new Error("Invalid audit time filter");
    const timestamp = {
      ...(input.since ? { $gte: new Date(input.since).toISOString() } : {}),
      ...(input.until ? { $lte: new Date(input.until).toISOString() } : {})
    };
    const entries = await this.db
      .repository<AuditEntry>("security_audit", { pluginId: "core-pack" })
      .findMany({
        filter: {
          ...(input.ownerPluginId ? { ownerPluginId: input.ownerPluginId } : {}),
          ...(input.actorId ? { actorId: input.actorId } : {}),
          ...(Object.keys(timestamp).length ? { timestamp } : {})
        },
        projection: { expiresAt: 0 },
        limit: this.includePlatform ? limit + offset : limit,
        offset: this.includePlatform ? 0 : offset,
        sort: { timestamp: "desc", id: "asc" }
      });
    if (!this.includePlatform) return entries;
    const at = {
      ...(input.since ? { $gte: new Date(input.since) } : {}),
      ...(input.until ? { $lte: new Date(input.until) } : {})
    };
    const platform = await this.db
      .repository<{
        id: string;
        at: Date;
        instanceId?: string;
        actorKind?: AuditEntry["actorKind"];
        actorId: string;
        owner: string;
        action: string;
        resourceId?: string;
        outcome: AuditEntry["outcome"];
        reason?: string;
        revision?: number;
        epoch?: number;
      }>("platform_audit", { pluginId: "kernel" })
      .findMany({
        filter: {
          ...(input.ownerPluginId ? { owner: input.ownerPluginId } : {}),
          ...(input.actorId ? { actorId: input.actorId } : {}),
          ...(Object.keys(at).length ? { at } : {})
        },
        limit: limit + offset,
        sort: { at: "desc", id: "asc" }
      });
    const mapped: AuditEntry[] = platform.map((entry) => ({
      id: entry.id,
      timestamp: new Date(entry.at).toISOString(),
      instanceId: entry.instanceId ?? "deploy-host",
      actorKind: entry.actorKind ?? "user",
      actorId: entry.actorId,
      ownerPluginId: entry.owner,
      action: entry.action,
      resourceId: entry.resourceId ?? entry.owner,
      outcome: entry.outcome,
      reason: entry.reason ?? "platform-operation",
      ...(entry.revision === undefined ? {} : { revision: entry.revision }),
      ...(entry.epoch === undefined ? {} : { epoch: entry.epoch })
    }));
    return [...entries, ...mapped]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp) || a.id.localeCompare(b.id))
      .slice(offset, offset + limit);
  }
}
