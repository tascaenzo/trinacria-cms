import { createHash, randomUUID } from "node:crypto";
import { s } from "@trinacria/schema";
import type { DbAdapter } from "../../contracts/db-adapter.js";
import type {
  ClaimSecureEventPayloadInput,
  EncryptedSecurePayload,
  SecureEventPayloadRecord
} from "../../contracts/secure-event-payloads.js";
import { KERNEL_NAMESPACE } from "../migrations/platform-storage.js";
import { defineEntity, type EntityRegistry } from "../persistence/entity-registry.js";
import {
  type HostTransactionRepositories,
  HostUnitOfWork
} from "../persistence/host-unit-of-work.js";
import type { MongoDbAdapter } from "../persistence/mongo-db-adapter.js";
import type { SecureEventPayloadCrypto } from "../secure-payloads/secure-event-payloads.crypto.js";
import type { SecureEventPayloadsService } from "../secure-payloads/secure-event-payloads.service.js";
import {
  type DurableDelivery,
  DurableDeliveryBlockedError,
  DurableDeliveryConflictError
} from "./durable-events.js";

export interface SecureEmailJob {
  id: string;
  eventId: string;
  ownerPluginId: string;
  consumerPluginId: "email-pack";
  claim: ClaimSecureEventPayloadInput;
  payloadAuthorization: SecureEventPayloadRecord;
  encryptedPayload: EncryptedSecurePayload;
  expiresAt: Date;
  createdAt: Date;
  availableAt: Date;
  status: "pending" | "running" | "retry" | "succeeded" | "blocked" | "ambiguous" | "cancelled";
  attempt: number;
  epoch: number;
  leaseOwner?: string;
  leaseUntil?: Date;
  reason?: string;
  purgeAt?: Date;
}
export const SECURE_EMAIL_JOB_ENTITY = defineEntity({
  ownerPluginId: "kernel",
  entityName: "secure_email_jobs",
  schema: s.object({}, { strict: false }),
  indexes: [
    { fields: { id: 1 }, unique: true, name: "secure_job_id" },
    {
      fields: { eventId: 1, consumerPluginId: 1 },
      unique: true,
      name: "secure_job_event_consumer"
    },
    { fields: { status: 1, availableAt: 1, leaseUntil: 1 }, name: "secure_job_acquisition" },
    { fields: { purgeAt: 1 }, expireAfterSeconds: 0, name: "secure_job_retention" }
  ]
});
export interface SecureEmailJobHost {
  /** Includes fresh subscription/claim grants, schema and desired state, also for already transferred jobs. */
  canSend(job: Omit<SecureEmailJob, "encryptedPayload">): Promise<boolean>;
  send(
    payload: unknown,
    input: { eventId: string; idempotencyKey: string; messageId: string; signal: AbortSignal }
  ): Promise<void>;
  /** Only set for a provider whose documented key covers the whole retry window. SMTP does not. */
  providerIdempotent?: boolean;
}
/** External effects deliberately execute outside Mongo transaction callbacks. */
export class SecureEmailJobStore {
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private readonly now: () => number;
  private closed = false;
  private paused = false;
  readonly metrics = { sent: 0, blocked: 0, ambiguous: 0, failures: 0, expired: 0, deadlines: 0 };
  constructor(
    private readonly db: MongoDbAdapter,
    registry: EntityRegistry,
    private readonly vault: SecureEventPayloadsService,
    private readonly crypto: SecureEventPayloadCrypto,
    private readonly host: SecureEmailJobHost,
    private readonly options: {
      instanceId: string;
      now?: () => number;
      leaseMs?: number;
      deadlineMs?: number;
      pollMs?: number;
    }
  ) {
    this.now = options.now ?? Date.now;
    if (
      !/^[a-zA-Z0-9._-]{1,120}$/.test(options.instanceId) ||
      !Number.isSafeInteger(options.leaseMs ?? 30000) ||
      (options.leaseMs ?? 30000) < 3 ||
      !Number.isSafeInteger(options.deadlineMs ?? 20000) ||
      (options.deadlineMs ?? 20000) < 1
    )
      throw new Error("Invalid secure job worker configuration");
    registry.register(SECURE_EMAIL_JOB_ENTITY);
  }
  private repository() {
    return this.db.repository<SecureEmailJob>("secure_email_jobs", KERNEL_NAMESPACE);
  }
  async initialize() {
    await this.db.ensureIndexes("kernel", ["secure_email_jobs"]);
  }
  async preflightClaim(delivery: DurableDelivery, input: ClaimSecureEventPayloadInput) {
    this.assertDelivery(delivery, input);
    await this.vault.assertClaimAllowed("email-pack", input);
  }
  private assertDelivery(delivery: DurableDelivery, input: ClaimSecureEventPayloadInput) {
    if (
      delivery.consumerPluginId !== "email-pack" ||
      delivery.eventName !== input.eventName ||
      input.payloadType !== "email-pack:send-email-request" ||
      input.requiredPermission !== "email-pack:email:send" ||
      input.schemaVersion !== 1
    )
      throw new DurableDeliveryBlockedError("contract-mismatch");
  }
  /** Called by the host inside the SAME transaction as delivery effects/inbox. No plaintext returns to the plugin. */
  async transfer(
    repositories: HostTransactionRepositories,
    delivery: DurableDelivery,
    input: ClaimSecureEventPayloadInput
  ): Promise<string> {
    this.assertDelivery(delivery, input);
    const jobs = repositories.repository<SecureEmailJob>("secure_email_jobs", KERNEL_NAMESPACE);
    const id = JSON.stringify([delivery.eventId, "email-pack"]);
    const existing = await jobs.findOne({ filter: { id } });
    if (existing) return existing.id;
    const adapter: DbAdapter = {
      repository: (name, namespace) => {
        if (namespace.pluginId !== "kernel" || namespace.workspaceId !== undefined)
          throw new Error("Secure job vault owner mismatch");
        return repositories.repository(name, namespace);
      },
      async beginTransaction() {
        throw new Error("Nested secure job transaction");
      },
      healthCheck: () => this.db.healthCheck()
    };
    const claimed = await this.vault.forTransaction(adapter).forPlugin("email-pack").claim(input);
    if (claimed.record.producerPluginId !== delivery.ownerPluginId)
      throw new DurableDeliveryBlockedError("contract-mismatch");
    const expiresAt = new Date(claimed.record.expiresAt ?? "");
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= this.now())
      throw new DurableDeliveryBlockedError("contract-mismatch");
    // Encrypt again under the active key; the job does not retain the consumed vault ciphertext.
    await jobs.insertOne({
      id,
      eventId: delivery.eventId,
      ownerPluginId: delivery.ownerPluginId,
      consumerPluginId: "email-pack",
      claim: { ...input },
      payloadAuthorization: claimed.record,
      encryptedPayload: this.crypto.encrypt(JSON.stringify(claimed.payload)),
      expiresAt,
      createdAt: new Date(this.now()),
      availableAt: new Date(this.now()),
      status: "pending",
      attempt: 0,
      epoch: 0,
      purgeAt: new Date(expiresAt.getTime() + 86400000)
    });
    return id;
  }
  async acquire(): Promise<SecureEmailJob | null> {
    if (this.closed || this.paused) return null;
    const now = this.now(),
      repository = this.repository();
    const candidates = await repository.findMany({
      filter: {
        $or: [
          { status: { $in: ["pending", "retry"] }, availableAt: { $lte: new Date(now) } },
          { status: "running", leaseUntil: { $lte: new Date(now) } }
        ]
      },
      limit: 100,
      sort: { availableAt: "asc", id: "asc" }
    });
    for (const job of candidates) {
      if (job.expiresAt.getTime() <= this.now()) {
        await repository.updateOne(
          { filter: { id: job.id, epoch: job.epoch, status: job.status } },
          { status: "cancelled", reason: "token-expired", purgeAt: new Date(this.now() + 86400000) }
        );
        this.metrics.expired++;
        continue;
      }
      if (job.status === "running" && !this.host.providerIdempotent) {
        await repository.updateOne(
          {
            filter: {
              id: job.id,
              epoch: job.epoch,
              status: "running",
              leaseUntil: { $lte: new Date(this.now()) }
            }
          },
          { status: "ambiguous", reason: "external-effect-unconfirmed", epoch: job.epoch + 1 }
        );
        this.metrics.ambiguous++;
        continue;
      }
      const { encryptedPayload: _cipher, ...metadata } = job;
      if (!(await this.host.canSend(metadata))) {
        await repository.updateOne(
          { filter: { id: job.id, epoch: job.epoch, status: job.status } },
          { status: "blocked", reason: "policy-or-plugin-inactive" }
        );
        this.metrics.blocked++;
        continue;
      }
      const claimed = await repository.updateOne(
        {
          filter: {
            id: job.id,
            epoch: job.epoch,
            status: job.status,
            ...(job.status === "running" ? { leaseUntil: { $lte: new Date(this.now()) } } : {}),
            expiresAt: { $gt: new Date(this.now()) }
          }
        },
        {
          status: "running",
          epoch: job.epoch + 1,
          attempt: job.attempt + 1,
          leaseOwner: this.options.instanceId,
          leaseUntil: new Date(this.now() + (this.options.leaseMs ?? 30000))
        }
      );
      if (claimed) return claimed;
    }
    return null;
  }
  private filter(job: SecureEmailJob) {
    return {
      id: job.id,
      status: "running",
      epoch: job.epoch,
      leaseOwner: this.options.instanceId,
      leaseUntil: { $gt: new Date(this.now()) }
    };
  }
  async process(job: SecureEmailJob) {
    const controller = new AbortController();
    const repository = this.repository();
    const heartbeat = setInterval(
      () => {
        void repository
          .updateOne(
            { filter: this.filter(job) },
            { leaseUntil: new Date(this.now() + (this.options.leaseMs ?? 30000)) }
          )
          .then((row) => {
            if (!row) {
              this.paused = true;
              controller.abort();
            }
          })
          .catch(() => {
            this.paused = true;
            controller.abort();
          });
      },
      Math.floor((this.options.leaseMs ?? 30000) / 3)
    );
    const deadline = setTimeout(() => {
      this.paused = true;
      this.metrics.deadlines++;
      controller.abort(new Error("Secure job deadline exceeded"));
    }, this.options.deadlineMs ?? 20000);
    let externalStarted = false;
    try {
      const { encryptedPayload: _cipher, ...metadata } = job;
      if (!(await this.host.canSend(metadata))) {
        await repository.updateOne(
          { filter: this.filter(job) },
          { status: "blocked", reason: "policy-or-plugin-inactive" }
        );
        this.metrics.blocked++;
        return;
      }
      if (job.expiresAt.getTime() <= this.now()) {
        await repository.updateOne(
          { filter: this.filter(job) },
          { status: "cancelled", reason: "token-expired" }
        );
        this.metrics.expired++;
        return;
      }
      const payload = JSON.parse(this.crypto.decrypt(job.encryptedPayload));
      if (
        !(await repository.updateOne(
          { filter: this.filter(job) },
          { reason: "external-effect-starting" }
        ))
      )
        throw new Error("Secure job lease lost before send");
      controller.signal.throwIfAborted();
      const digest = createHash("sha256").update(job.id).digest("hex");
      externalStarted = true;
      await this.host.send(payload, {
        eventId: job.eventId,
        idempotencyKey: digest,
        messageId: `<${digest}@trinacria.invalid>`,
        signal: controller.signal
      });
      controller.signal.throwIfAborted();
      if (
        !(await repository.updateOne(
          { filter: this.filter(job) },
          {
            status: "succeeded",
            reason: "provider-confirmed",
            purgeAt: new Date(this.now() + 86400000)
          }
        ))
      )
        throw new Error("Secure job lease lost after send");
      this.metrics.sent++;
    } catch {
      this.metrics.failures++;
      const retry = externalStarted && this.host.providerIdempotent && job.attempt < 8;
      await repository.updateOne(
        { filter: this.filter(job) },
        {
          status: !externalStarted ? "blocked" : retry ? "retry" : "ambiguous",
          reason: !externalStarted ? "pre-send-validation-failed" : "external-effect-unconfirmed",
          availableAt: new Date(
            this.now() + Math.min(300000, 1000 * 2 ** Math.min(job.attempt, 18))
          )
        }
      );
      if (externalStarted && !retry) this.metrics.ambiguous++;
    } finally {
      clearInterval(heartbeat);
      clearTimeout(deadline);
    }
  }
  async tick() {
    if (this.running) return this.running;
    this.running = (async () => {
      const job = await this.acquire();
      if (job) await this.process(job);
    })().finally(() => {
      this.running = undefined;
    });
    return this.running;
  }
  async start() {
    if (this.timer) return;
    await this.tick();
    this.timer = setInterval(() => {
      void this.tick().catch(() => this.metrics.failures++);
    }, this.options.pollMs ?? 1000);
    this.timer.unref();
  }
  async close() {
    this.closed = true;
    clearInterval(this.timer);
    await this.running;
  }
  async decide(
    id: string,
    expectedEpoch: number,
    action: "retry" | "cancel",
    actorId: string,
    reason: string
  ) {
    if (
      !actorId.trim() ||
      !reason.trim() ||
      reason.length > 500 ||
      !Number.isSafeInteger(expectedEpoch)
    )
      throw new Error("Reviewed secure job decision required");
    await new HostUnitOfWork(this.db).run([KERNEL_NAMESPACE], async (r) => {
      const repo = r.repository<SecureEmailJob>("secure_email_jobs", KERNEL_NAMESPACE);
      const job = await repo.findOne({ filter: { id } });
      if (
        !job ||
        job.epoch !== expectedEpoch ||
        job.status === "succeeded" ||
        job.status === "running" ||
        job.expiresAt.getTime() <= this.now()
      )
        throw new DurableDeliveryConflictError(
          "Secure job decision conflicts with status, epoch or expiry"
        );
      if (!["retry", "cancel"].includes(action)) throw new Error("Invalid secure job decision");
      const updated = await repo.updateOne(
        { filter: { id, epoch: expectedEpoch, status: job.status } },
        {
          status: action === "retry" ? "pending" : "cancelled",
          epoch: job.epoch + 1,
          availableAt: new Date(this.now()),
          reason: "operator-reconciled",
          purgeAt:
            action === "cancel"
              ? new Date(this.now() + 86400000)
              : new Date(job.expiresAt.getTime() + 86400000)
        }
      );
      if (!updated) throw new DurableDeliveryConflictError("Secure job decision lost its epoch");
      await r.repository("platform_audit", KERNEL_NAMESPACE).insertOne({
        id: randomUUID(),
        owner: job.ownerPluginId,
        at: new Date(this.now()),
        instanceId: this.options.instanceId,
        actorKind: "user",
        actorId,
        action: `email-job.${action}`,
        resourceId: id,
        outcome: "allowed",
        reason,
        epoch: expectedEpoch + 1,
        purgeAt: new Date(this.now() + 90 * 86400000)
      });
    });
  }
  /** Host key rotation; CAS never changes delivery status or claim count. */
  async reencryptBatch(
    oldKeyId: string,
    limit = 100
  ): Promise<{ scanned: number; changed: number }> {
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      oldKeyId === this.crypto.activeKeyId
    )
      throw new Error("Invalid secure job rotation input");
    const rows = await this.repository().findMany({
      filter: { "encryptedPayload.keyVersion": oldKeyId },
      limit,
      sort: { id: "asc" }
    });
    let changed = 0;
    for (const job of rows)
      if (
        await this.repository().updateOne(
          {
            filter: {
              id: job.id,
              epoch: job.epoch,
              "encryptedPayload.keyVersion": oldKeyId,
              "encryptedPayload.cipherText": job.encryptedPayload.cipherText
            }
          },
          { encryptedPayload: this.crypto.encrypt(this.crypto.decrypt(job.encryptedPayload)) }
        )
      )
        changed++;
    return { scanned: rows.length, changed };
  }
  async readiness() {
    try {
      if (!this.timer || this.closed || this.paused)
        return { ok: false, reason: "secure-job-worker-unavailable" };
      const ambiguous = await this.repository().findOne({
        filter: { status: "ambiguous", expiresAt: { $gt: new Date(this.now()) } }
      });
      return ambiguous ? { ok: false, reason: "secure-job-reconciliation-required" } : { ok: true };
    } catch {
      return { ok: false, reason: "secure-job-store-unavailable" };
    }
  }
  async get(id: string) {
    const row = await this.repository().findOne({ filter: { id } });
    if (!row) return null;
    const {
      encryptedPayload: _cipher,
      claim: _claim,
      payloadAuthorization: _auth,
      ...metadata
    } = row;
    return metadata;
  }
  async list(
    input: {
      status?: SecureEmailJob["status"];
      ownerPluginId?: string;
      eventId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<
    readonly Omit<SecureEmailJob, "encryptedPayload" | "claim" | "payloadAuthorization">[]
  > {
    const { limit = 100, offset = 0, ...filter } = input;
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 10000
    )
      throw new Error("Invalid job pagination");
    return (
      await this.repository().findMany({
        filter,
        limit,
        offset,
        sort: { createdAt: "asc", id: "asc" }
      })
    ).map(
      ({ encryptedPayload: _cipher, claim: _claim, payloadAuthorization: _auth, ...row }) => row
    );
  }
}
