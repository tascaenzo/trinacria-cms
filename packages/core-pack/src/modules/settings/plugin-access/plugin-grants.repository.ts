import { createHash } from "node:crypto";
import {
  type DbAdapter,
  type PluginAccessGrant,
  type PluginAccessGrantStatus,
  s
} from "@trinacria-cms/kernel";
import { defineEntity } from "@trinacria-cms/kernel/runtime";
import { SecurityAuditStore } from "../../security/audit/security-audit.js";
export interface PluginGrantIdentity {
  producerPluginId: string;
  consumerPluginId: string;
  accessType: NonNullable<PluginAccessGrant["accessType"]>;
  resource?: string;
  action?: string;
  operation?: string;
  requiredPermission: string;
  workspaceId?: string;
}
export interface PluginGrantRecord extends PluginAccessGrant {
  id: string;
  accessType: NonNullable<PluginAccessGrant["accessType"]>;
  revision: number;
  target: string;
  payloadType: string;
  workspaceId: string;
  updatedAt: string;
  revokedAt?: string;
}
export const PLUGIN_GRANTS_ENTITY = defineEntity({
  ownerPluginId: "core-pack",
  entityName: "plugin_access_grants",
  schema: s.object({}, { strict: false }),
  indexes: [
    {
      fields: {
        producerPluginId: 1,
        consumerPluginId: 1,
        accessType: 1,
        target: 1,
        payloadType: 1,
        requiredPermission: 1,
        workspaceId: 1
      },
      unique: true,
      name: "plugin_grant_identity"
    },
    { fields: { id: 1 }, unique: true, name: "plugin_grant_id" },
    { fields: { status: 1, updatedAt: -1 }, name: "plugin_grant_status" }
  ]
});
export class PluginGrantConflictError extends Error {
  readonly code = "plugin_grant_conflict";
  readonly status = 409;
}
export function normalizeGrant(
  input: PluginGrantIdentity
): Omit<PluginGrantRecord, "status" | "revision" | "updatedAt"> {
  const canonical = (value: unknown) => {
    if (typeof value !== "string" || !/^[a-z0-9][a-z0-9._/:-]{0,219}$/.test(value))
      throw new Error("Invalid canonical grant identity");
    return value;
  };
  const producerPluginId = canonical(input.producerPluginId),
    consumerPluginId = canonical(input.consumerPluginId),
    requiredPermission = canonical(input.requiredPermission);
  if (!/^[^:]+:[^:]+:[^:]+$/.test(requiredPermission)) throw new Error("Invalid grant permission");
  const accessType = input.accessType;
  if (accessType !== "api") throw new Error("HTTP API grant access type required");
  const supported = [
    "producerPluginId",
    "consumerPluginId",
    "accessType",
    "resource",
    "action",
    "operation",
    "requiredPermission",
    "workspaceId"
  ];
  if (Object.keys(input).some((key) => !supported.includes(key)))
    throw new Error("Unsupported HTTP grant scope");
  const workspaceId = input.workspaceId === undefined ? "" : canonical(input.workspaceId);
  const resource = canonical(input.resource),
    action = canonical(input.action);
  const operation = input.operation ? canonical(input.operation) : "";
  if (requiredPermission !== `${producerPluginId}:${resource}:${action}`)
    throw new Error("Invalid HTTP API grant permission");
  const target = JSON.stringify([resource, action, operation]);
  // Keep the fixed empty discriminator in the physical identity/index; it is never an access capability.
  const payloadType = "";
  const identity = {
    producerPluginId,
    consumerPluginId,
    accessType,
    target,
    payloadType,
    requiredPermission,
    workspaceId
  };
  return {
    id: createHash("sha256").update(JSON.stringify(identity)).digest("hex"),
    ...identity,
    resource,
    action,
    operation
  };
}
export class PluginGrantsRepository {
  private initialization?: Promise<void>;
  constructor(
    private readonly db: DbAdapter,
    private readonly audit = new SecurityAuditStore(db),
    private readonly instanceId = "core-host"
  ) {}
  private repository(db = this.db) {
    return db.repository<PluginGrantRecord>("plugin_access_grants", { pluginId: "core-pack" });
  }
  private async ready() {
    this.initialization ??= (
      this.db.ensureIndexes?.("core-pack", ["plugin_access_grants", "security_audit"]) ??
      Promise.resolve()
    ).catch((error) => {
      this.initialization = undefined;
      throw error;
    });
    await this.initialization;
  }
  async get(id: string) {
    await this.ready();
    return this.repository().findOne({ filter: { id } });
  }
  async list(limit = 100, offset = 0) {
    await this.ready();
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isSafeInteger(offset) ||
      offset < 0
    )
      throw new Error("Invalid grant pagination");
    return this.repository().findMany({ limit, offset, sort: { updatedAt: "desc", id: "asc" } });
  }
  async find(input: PluginGrantIdentity) {
    return this.get(normalizeGrant(input).id);
  }
  async request(input: PluginGrantIdentity): Promise<PluginGrantRecord> {
    const normalized = normalizeGrant(input);
    const existing = await this.get(normalized.id);
    if (existing) return existing;
    try {
      return await this.transaction(async (db) => {
        const record = await this.repository(db).insertOne({
          ...normalized,
          status: "pending",
          revision: 1,
          reason: "runtime-request",
          updatedAt: new Date().toISOString()
        });
        await this.audit.appendIn(db, {
          instanceId: this.instanceId,
          actorKind: "plugin",
          actorId: record.consumerPluginId,
          ownerPluginId: record.producerPluginId,
          action: "plugin-grant.request",
          resourceId: record.id,
          outcome: "denied",
          reason: "pending",
          revision: 1
        });
        return record;
      });
    } catch (error) {
      if (
        (error as { code?: unknown }).code !== 11000 &&
        (error as { cause?: { code?: unknown } }).cause?.code !== 11000
      )
        throw error;
      const created = await this.get(normalized.id);
      if (!created) throw error;
      return created;
    }
  }
  async decide(
    id: string,
    status: Exclude<PluginAccessGrantStatus, "pending">,
    expectedRevision: number,
    actorId: string,
    reason: string
  ): Promise<PluginGrantRecord> {
    if (
      !["approved", "denied", "revoked"].includes(status) ||
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 1 ||
      !actorId.trim() ||
      !reason.trim() ||
      reason.length > 500 ||
      /[\r\n\0]/.test(reason)
    )
      throw new Error("Invalid grant decision");
    return this.transaction(async (db) => {
      const now = new Date().toISOString();
      const record = await this.repository(db).updateOne(
        { filter: { id, revision: expectedRevision } },
        {
          status,
          revision: expectedRevision + 1,
          reason: reason.trim(),
          updatedAt: now,
          ...(status === "approved" ? { approvedBy: actorId, approvedAt: now } : {}),
          ...(status === "revoked" ? { revokedAt: now } : {})
        }
      );
      if (!record) throw new PluginGrantConflictError("Grant is missing or its revision changed");
      await this.audit.appendIn(db, {
        instanceId: this.instanceId,
        actorKind: "user",
        actorId,
        ownerPluginId: record.producerPluginId,
        action: `plugin-grant.${status}`,
        resourceId: id,
        outcome: "allowed",
        reason: "operator-decision",
        revision: record.revision
      });
      return record;
    });
  }
  private async transaction<T>(work: (db: DbAdapter) => Promise<T>): Promise<T> {
    await this.ready();
    if (!this.db.withTransaction)
      throw new Error("Plugin grants require atomic Mongo transactions");
    return this.db.withTransaction({ pluginId: "core-pack" }, work);
  }
}
