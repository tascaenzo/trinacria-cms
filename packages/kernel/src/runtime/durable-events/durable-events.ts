import { randomUUID } from "node:crypto";
import { s } from "@trinacria/schema";
import type { DbAdapter } from "../../contracts/db-adapter.js";
import type { PluginEventPublisher } from "../../contracts/plugin-runtime.js";
import { KERNEL_NAMESPACE } from "../migrations/platform-storage.js";
import { defineEntity, type EntityRegistry } from "../persistence/entity-registry.js";
import {
  type HostTransactionRepositories,
  HostUnitOfWork
} from "../persistence/host-unit-of-work.js";
import type { MongoDbAdapter } from "../persistence/mongo-db-adapter.js";
import { copyPluginJson } from "../plugin-runtime/plugin-host-services.js";

export interface DurableRecipient {
  consumerPluginId: string;
  handlerName: string;
  handlerVersion: string;
}
export interface DurablePublication {
  ownerPluginId: string;
  eventName: string;
  payloadVersion: number;
  payload: unknown;
  recipients: readonly DurableRecipient[];
}
export interface DurablePublishOptions {
  notBefore?: Date;
  partitionKey?: string;
  correlationId?: string;
  causationId?: string;
}
export interface DurableOutbox extends DurablePublication {
  id: string;
  occurredAt: Date;
  notBefore: Date;
  state: "materializing" | "materialized";
  partitionKey?: string;
  sequence?: number;
  correlationId?: string;
  causationId?: string;
  purgeAt?: Date;
}
export type DeliveryStatus =
  | "pending"
  | "running"
  | "retry"
  | "succeeded"
  | "blocked"
  | "dead-letter"
  | "cancelled";
export interface DurableDelivery extends DurableRecipient {
  id: string;
  eventId: string;
  ownerPluginId: string;
  eventName: string;
  payloadVersion: number;
  status: DeliveryStatus;
  attempt: number;
  epoch: number;
  createdAt: Date;
  availableAt: Date;
  leaseOwner?: string;
  leaseUntil?: Date;
  partitionKey?: string;
  sequence?: number;
  reason?: string;
  completedAt?: Date;
  purgeAt?: Date;
}
interface Inbox {
  id: string;
  eventId: string;
  consumerPluginId: string;
  handlerName: string;
  handlerVersion: string;
  completedAt: Date;
  purgeAt: Date;
}
const common = s.object({}, { strict: false });
export const DURABLE_EVENT_ENTITIES = [
  defineEntity({
    ownerPluginId: "kernel",
    entityName: "event_outbox",
    schema: common,
    indexes: [
      { fields: { id: 1 }, unique: true, name: "outbox_id" },
      { fields: { state: 1, occurredAt: 1 }, name: "outbox_materialization" },
      { fields: { purgeAt: 1 }, expireAfterSeconds: 0, name: "outbox_retention" }
    ]
  }),
  defineEntity({
    ownerPluginId: "kernel",
    entityName: "event_deliveries",
    schema: common,
    indexes: [
      { fields: { id: 1 }, unique: true, name: "delivery_id" },
      {
        fields: { eventId: 1, consumerPluginId: 1, handlerName: 1 },
        unique: true,
        name: "delivery_recipient"
      },
      { fields: { status: 1, availableAt: 1, leaseUntil: 1 }, name: "delivery_acquisition" },
      {
        fields: { consumerPluginId: 1, handlerName: 1, partitionKey: 1, sequence: 1 },
        name: "delivery_order"
      },
      { fields: { purgeAt: 1 }, expireAfterSeconds: 0, name: "delivery_retention" }
    ]
  }),
  defineEntity({
    ownerPluginId: "kernel",
    entityName: "event_inbox",
    schema: common,
    indexes: [
      { fields: { id: 1 }, unique: true, name: "inbox_id" },
      {
        fields: { consumerPluginId: 1, handlerName: 1, eventId: 1 },
        unique: true,
        name: "inbox_recipient"
      },
      { fields: { purgeAt: 1 }, expireAfterSeconds: 0, name: "inbox_retention" }
    ]
  }),
  defineEntity({
    ownerPluginId: "kernel",
    entityName: "event_partitions",
    schema: common,
    indexes: [{ fields: { id: 1 }, unique: true, name: "partition_id" }]
  })
] as const;
export class DurableDeliveryBlockedError extends Error {
  readonly code = "durable_delivery_blocked";
  constructor(
    readonly reason: "policy-denied" | "plugin-inactive" | "contract-mismatch" | "handler-missing"
  ) {
    super(reason);
  }
}
export class DurableDeliveryConflictError extends Error {
  readonly code = "delivery_conflict";
}
export class DurableDeliveryLeaseError extends Error {
  readonly code = "durable_delivery_lease_lost";
  constructor() {
    super("Delivery lease was replaced or expired");
  }
}
export interface DurableEventHost {
  describe(ownerPluginId: string, eventName: string, payload: unknown): Promise<DurablePublication>;
  /** Must use the supplied session-bound adapter; external effects belong in a separate durable job. */
  dispatch(
    delivery: DurableDelivery,
    outbox: DurableOutbox,
    adapter: DbAdapter,
    signal: AbortSignal,
    publisher: PluginEventPublisher,
    repositories: HostTransactionRepositories
  ): Promise<void>;
  additionalReadiness?(): Promise<{ ok: boolean; reason?: string }>;
  beforeDispatch?(delivery: DurableDelivery, outbox: DurableOutbox): Promise<void>;
  assertConsumerActive?(consumerPluginId: string): Promise<void>;
}
export interface DurableEventOptions {
  instanceId: string;
  concurrency?: number;
  leaseMs?: number;
  heartbeatMs?: number;
  deadlineMs?: number;
  maxAttempts?: number;
  pollMs?: number;
  now?: () => number;
  random?: () => number;
}
/** Mongo outbox + inbox. No dependency on the local event bus's deduplication state. */
export class MongoDurableEventStore {
  private readonly uow: HostUnitOfWork;
  private readonly now: () => number;
  private readonly random: () => number;
  private timer?: ReturnType<typeof setInterval>;
  private ticking?: Promise<void>;
  private closed = false;
  private initialized = false;
  private readonly pausedConsumers = new Set<string>();
  private readonly active = new Set<Promise<void>>();
  readonly metrics = {
    attempts: 0,
    completed: 0,
    blocked: 0,
    deadLetters: 0,
    expiredLeases: 0,
    storeFailures: 0,
    deadlineExceeded: 0
  };
  constructor(
    private readonly adapter: MongoDbAdapter,
    private readonly registry: EntityRegistry,
    private readonly host: DurableEventHost,
    private readonly options: DurableEventOptions
  ) {
    this.uow = new HostUnitOfWork(adapter);
    this.now = options.now ?? Date.now;
    this.random = options.random ?? Math.random;
    if (!/^[a-zA-Z0-9._-]{1,120}$/.test(options.instanceId))
      throw new Error("Invalid durable worker ID");
    for (const value of [
      options.concurrency ?? 4,
      options.leaseMs ?? 30000,
      options.heartbeatMs ?? 10000,
      options.deadlineMs ?? 20000,
      options.maxAttempts ?? 8,
      options.pollMs ?? 1000
    ])
      if (!Number.isSafeInteger(value) || value < 1)
        throw new Error("Invalid durable worker timing");
    if ((options.heartbeatMs ?? 10000) >= (options.leaseMs ?? 30000))
      throw new Error("Delivery heartbeat must precede expiry");
    for (const entity of DURABLE_EVENT_ENTITIES) registry.register(entity);
  }
  private repository<T>(entity: string) {
    return this.adapter.repository<T>(entity, KERNEL_NAMESPACE);
  }
  async initialize() {
    await this.adapter.ensureIndexes(
      "kernel",
      DURABLE_EVENT_ENTITIES.map((e) => e.entityName)
    );
    this.initialized = true;
  }
  isInitialized() {
    return this.initialized && !this.closed;
  }
  private requireReady() {
    if (!this.isInitialized()) throw new Error("Durable event storage unavailable");
  }
  /** Only this owner plus kernel are allowed; plugin callers never receive the kernel repository object. */
  async transaction<T>(
    ownerPluginId: string,
    work: (adapter: DbAdapter, publisher: PluginEventPublisher) => Promise<T>
  ): Promise<T> {
    return this.transactionWithKernel(ownerPluginId, work);
  }
  async transactionWithKernel<T>(
    ownerPluginId: string,
    work: (
      adapter: DbAdapter,
      publisher: PluginEventPublisher,
      repositories: HostTransactionRepositories
    ) => Promise<T>
  ): Promise<T> {
    this.requireReady();
    return this.uow.run([{ pluginId: ownerPluginId }, KERNEL_NAMESPACE], async (repositories) => {
      const adapter = this.scopedAdapter(repositories, ownerPluginId);
      return work(adapter, this.publisher(repositories, ownerPluginId), repositories);
    });
  }
  private scopedAdapter(
    repositories: HostTransactionRepositories,
    ownerPluginId: string
  ): DbAdapter {
    return Object.freeze({
      repository<T>(name: string, namespace: { pluginId: string; workspaceId?: string }) {
        if (namespace.pluginId !== ownerPluginId || namespace.workspaceId !== undefined)
          throw new Error("Durable transaction owner mismatch");
        return repositories.repository<T>(name, namespace);
      },
      async beginTransaction() {
        throw new Error("Nested durable transactions unavailable");
      },
      healthCheck: () => this.adapter.healthCheck()
    });
  }
  private publisher(
    repositories: HostTransactionRepositories,
    ownerPluginId: string
  ): PluginEventPublisher {
    return Object.freeze({
      emit: async (name: string, payload: unknown, options?: DurablePublishOptions) => {
        await this.append(
          repositories,
          await this.host.describe(ownerPluginId, name, payload),
          options
        );
      }
    });
  }
  async publish(
    ownerPluginId: string,
    eventName: string,
    payload: unknown,
    options?: DurablePublishOptions
  ): Promise<string> {
    this.requireReady();
    const publication = await this.host.describe(ownerPluginId, eventName, payload);
    return this.uow.run([{ pluginId: ownerPluginId }, KERNEL_NAMESPACE], (r) =>
      this.append(r, publication, options)
    );
  }
  private async append(
    repositories: HostTransactionRepositories,
    input: DurablePublication,
    options: DurablePublishOptions = {}
  ): Promise<string> {
    const payload = copyPluginJson(input.payload),
      now = this.now();
    if (
      !/^[a-z0-9][a-z0-9._/-]*:[a-z0-9][a-z0-9._/-]*$/.test(input.eventName) ||
      !input.eventName.startsWith(`${input.ownerPluginId}:`) ||
      !Number.isSafeInteger(input.payloadVersion) ||
      input.payloadVersion < 1
    )
      throw new Error("Invalid durable event identity");
    if (input.recipients.length > 1000) throw new Error("Durable recipient limit exceeded");
    for (const value of [options.partitionKey, options.correlationId, options.causationId])
      if (
        value !== undefined &&
        (typeof value !== "string" || !value || value.length > 200 || /[\r\n\0]/.test(value))
      )
        throw new Error("Invalid event routing metadata");
    const notBefore = options.notBefore ?? new Date(now);
    if (!(notBefore instanceof Date) || !Number.isFinite(notBefore.getTime()))
      throw new Error("Invalid deferred delivery time");
    let sequence: number | undefined;
    const partitionKey =
      options.partitionKey === undefined
        ? undefined
        : JSON.stringify([input.ownerPluginId, options.partitionKey]);
    if (partitionKey) {
      const repo = repositories.repository<{ id: string; sequence: number }>(
        "event_partitions",
        KERNEL_NAMESPACE
      );
      const current = await repo.findOne({ filter: { id: partitionKey } });
      sequence = (current?.sequence ?? 0) + 1;
      if (current) {
        if (
          !(await repo.updateOne(
            { filter: { id: partitionKey, sequence: current.sequence } },
            { sequence }
          ))
        )
          throw new Error("Concurrent event partition allocation");
      } else await repo.insertOne({ id: partitionKey, sequence });
    }
    const id = randomUUID();
    await repositories.repository<DurableOutbox>("event_outbox", KERNEL_NAMESPACE).insertOne({
      ...input,
      payload,
      recipients: [
        ...new Map(
          input.recipients.map((r) => [
            JSON.stringify([r.consumerPluginId, r.handlerName]),
            { ...r }
          ])
        ).values()
      ],
      id,
      occurredAt: new Date(now),
      notBefore,
      state: "materializing",
      ...(partitionKey ? { partitionKey, sequence } : {}),
      ...(options.correlationId ? { correlationId: options.correlationId } : {}),
      ...(options.causationId ? { causationId: options.causationId } : {})
    });
    return id;
  }
  async materialize(limit = 100): Promise<number> {
    this.requireReady();
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
      throw new Error("Invalid materializer limit");
    const candidates = await this.repository<DurableOutbox>("event_outbox").findMany({
      filter: { state: "materializing" },
      limit,
      sort: { occurredAt: "asc", id: "asc" }
    });
    let count = 0;
    for (const candidate of candidates)
      await this.uow.run([KERNEL_NAMESPACE], async (r) => {
        const outboxRepo = r.repository<DurableOutbox>("event_outbox", KERNEL_NAMESPACE);
        const outbox = await outboxRepo.findOne({
          filter: { id: candidate.id, state: "materializing" }
        });
        if (!outbox) return;
        const deliveries = r.repository<DurableDelivery>("event_deliveries", KERNEL_NAMESPACE);
        for (const recipient of outbox.recipients) {
          const id = JSON.stringify([outbox.id, recipient.consumerPluginId, recipient.handlerName]);
          if (!(await deliveries.findOne({ filter: { id } })))
            await deliveries.insertOne({
              ...recipient,
              id,
              eventId: outbox.id,
              ownerPluginId: outbox.ownerPluginId,
              eventName: outbox.eventName,
              payloadVersion: outbox.payloadVersion,
              status: "pending",
              attempt: 0,
              epoch: 0,
              createdAt: outbox.occurredAt,
              availableAt: outbox.notBefore,
              ...(outbox.partitionKey
                ? { partitionKey: outbox.partitionKey, sequence: outbox.sequence }
                : {})
            });
        }
        await outboxRepo.updateOne(
          { filter: { id: outbox.id, state: "materializing" } },
          {
            state: "materialized",
            ...(outbox.recipients.length ? {} : { purgeAt: new Date(this.now() + 30 * 86400000) })
          }
        );
        count++;
      });
    return count;
  }
  async acquire(): Promise<DurableDelivery | null> {
    this.requireReady();
    const now = this.now();
    const candidates = await this.repository<DurableDelivery>("event_deliveries").findMany({
      filter: {
        $or: [
          { status: { $in: ["pending", "retry"] }, availableAt: { $lte: new Date(now) } },
          { status: "running", leaseUntil: { $lte: new Date(now) } }
        ]
      },
      limit: 100,
      sort: { availableAt: "asc", createdAt: "asc", id: "asc" }
    });
    for (const candidate of candidates) {
      if (this.pausedConsumers.has(candidate.consumerPluginId)) continue;
      const claimed = await this.uow.run([KERNEL_NAMESPACE], async (r) => {
        const repository = r.repository<DurableDelivery>("event_deliveries", KERNEL_NAMESPACE);
        if (
          candidate.partitionKey &&
          (await repository.findOne({
            filter: {
              consumerPluginId: candidate.consumerPluginId,
              handlerName: candidate.handlerName,
              partitionKey: candidate.partitionKey,
              sequence: { $lt: candidate.sequence },
              status: { $nin: ["succeeded", "cancelled"] }
            }
          }))
        )
          return null;
        if (candidate.partitionKey) {
          const earlier = await r
            .repository<DurableOutbox>("event_outbox", KERNEL_NAMESPACE)
            .findMany({
              filter: {
                partitionKey: candidate.partitionKey,
                sequence: { $lt: candidate.sequence },
                state: "materializing"
              },
              limit: 1000
            });
          if (
            earlier.some((event) =>
              event.recipients.some(
                (recipient) =>
                  recipient.consumerPluginId === candidate.consumerPluginId &&
                  recipient.handlerName === candidate.handlerName
              )
            )
          )
            return null;
        }
        // Touch partition row to serialize two workers selecting consecutive deliveries.
        if (candidate.partitionKey) {
          const partitions = r.repository<{ id: string; sequence: number; fence?: number }>(
            "event_partitions",
            KERNEL_NAMESPACE
          );
          const partition = await partitions.findOne({ filter: { id: candidate.partitionKey } });
          if (
            !partition ||
            !(await partitions.updateOne(
              {
                filter: {
                  id: partition.id,
                  sequence: partition.sequence,
                  ...(partition.fence === undefined ? {} : { fence: partition.fence })
                }
              },
              { fence: (partition.fence ?? 0) + 1 }
            ))
          )
            throw new Error("Concurrent partition acquisition");
        }
        return repository.updateOne(
          {
            filter: {
              id: candidate.id,
              status: candidate.status,
              epoch: candidate.epoch,
              ...(candidate.status === "running"
                ? { leaseUntil: { $lte: new Date(this.now()) } }
                : { availableAt: { $lte: new Date(this.now()) } })
            }
          },
          {
            status: "running",
            leaseOwner: this.options.instanceId,
            leaseUntil: new Date(this.now() + (this.options.leaseMs ?? 30000)),
            epoch: candidate.epoch + 1,
            attempt: candidate.attempt + 1
          }
        );
      });
      if (claimed) {
        if (candidate.status === "running") this.metrics.expiredLeases++;
        this.metrics.attempts++;
        return claimed;
      }
    }
    return null;
  }
  private leaseFilter(delivery: DurableDelivery) {
    return {
      id: delivery.id,
      status: "running",
      epoch: delivery.epoch,
      leaseOwner: this.options.instanceId,
      leaseUntil: { $gt: new Date(this.now()) }
    };
  }
  async heartbeat(delivery: DurableDelivery) {
    if (
      !(await this.repository<DurableDelivery>("event_deliveries").updateOne(
        { filter: this.leaseFilter(delivery) },
        { leaseUntil: new Date(this.now() + (this.options.leaseMs ?? 30000)) }
      ))
    )
      throw new DurableDeliveryLeaseError();
  }
  /** Public host hook for deterministic worker/crash integration tests. */
  async process(delivery: DurableDelivery): Promise<void> {
    const controller = new AbortController();
    const deadline = setTimeout(() => {
      this.pausedConsumers.add(delivery.consumerPluginId);
      this.metrics.deadlineExceeded++;
      controller.abort(new Error("Delivery deadline exceeded"));
    }, this.options.deadlineMs ?? 20000);
    const heartbeat = setInterval(() => {
      void this.heartbeat(delivery).catch(() => {
        this.metrics.storeFailures++;
        this.pausedConsumers.add(delivery.consumerPluginId);
        controller.abort(new DurableDeliveryLeaseError());
      });
    }, this.options.heartbeatMs ?? 10000);
    try {
      if (delivery.attempt > (this.options.maxAttempts ?? 8))
        throw new Error("Delivery attempt limit reached");
      await this.host.assertConsumerActive?.(delivery.consumerPluginId);
      const committedOutbox = await this.repository<DurableOutbox>("event_outbox").findOne({
        filter: { id: delivery.eventId }
      });
      if (!committedOutbox) throw new DurableDeliveryBlockedError("contract-mismatch");
      await this.host.beforeDispatch?.(delivery, committedOutbox);
      await this.uow.run([{ pluginId: delivery.consumerPluginId }, KERNEL_NAMESPACE], async (r) => {
        controller.signal.throwIfAborted();
        const deliveries = r.repository<DurableDelivery>("event_deliveries", KERNEL_NAMESPACE);
        if (
          !(await deliveries.updateOne(
            { filter: this.leaseFilter(delivery) },
            { reason: "handler-running" }
          ))
        )
          throw new DurableDeliveryLeaseError();
        const inbox = r.repository<Inbox>("event_inbox", KERNEL_NAMESPACE);
        const id = JSON.stringify([
          delivery.consumerPluginId,
          delivery.handlerName,
          delivery.eventId
        ]);
        if (!(await inbox.findOne({ filter: { id } }))) {
          const outbox = await r
            .repository<DurableOutbox>("event_outbox", KERNEL_NAMESPACE)
            .findOne({ filter: { id: delivery.eventId } });
          if (!outbox) throw new DurableDeliveryBlockedError("contract-mismatch");
          await this.host.dispatch(
            delivery,
            outbox,
            this.scopedAdapter(r, delivery.consumerPluginId),
            controller.signal,
            this.publisher(r, delivery.consumerPluginId),
            r
          );
          controller.signal.throwIfAborted();
          await inbox.insertOne({
            id,
            eventId: delivery.eventId,
            consumerPluginId: delivery.consumerPluginId,
            handlerName: delivery.handlerName,
            handlerVersion: delivery.handlerVersion,
            completedAt: new Date(this.now()),
            purgeAt: new Date(this.now() + 30 * 86400000)
          });
        }
        if (
          !(await deliveries.updateOne(
            { filter: this.leaseFilter(delivery) },
            {
              status: "succeeded",
              reason: "handler-completed",
              completedAt: new Date(this.now()),
              purgeAt: new Date(this.now() + 30 * 86400000)
            }
          ))
        )
          throw new DurableDeliveryLeaseError();
      });
      await this.releaseCompletedOutbox(delivery.eventId).catch(() => this.metrics.storeFailures++);
      this.metrics.completed++;
    } catch (error) {
      if (error instanceof DurableDeliveryLeaseError || controller.signal.aborted) throw error;
      const blocked = error instanceof DurableDeliveryBlockedError;
      const dead = !blocked && delivery.attempt >= (this.options.maxAttempts ?? 8);
      const backoff = Math.min(300000, 1000 * 2 ** Math.min(18, delivery.attempt - 1));
      await this.repository<DurableDelivery>("event_deliveries").updateOne(
        { filter: this.leaseFilter(delivery) },
        {
          status: blocked ? "blocked" : dead ? "dead-letter" : "retry",
          reason: blocked ? error.reason : "handler-failed",
          availableAt: new Date(
            this.now() + backoff + Math.floor(this.random() * Math.min(1000, backoff))
          ),
          ...(dead && !delivery.partitionKey
            ? { purgeAt: new Date(this.now() + 90 * 86400000) }
            : {})
        }
      );
      if (blocked) this.metrics.blocked++;
      if (dead) {
        this.metrics.deadLetters++;
        await this.releaseCompletedOutbox(delivery.eventId).catch(
          () => this.metrics.storeFailures++
        );
      }
    } finally {
      clearTimeout(deadline);
      clearInterval(heartbeat);
    }
  }
  private async releaseCompletedOutbox(eventId: string) {
    await this.uow.run([KERNEL_NAMESPACE], async (r) => {
      const deliveries = await r
        .repository<DurableDelivery>("event_deliveries", KERNEL_NAMESPACE)
        .findMany({ filter: { eventId }, limit: 1000 });
      if (
        deliveries.some(
          (delivery) =>
            !["succeeded", "cancelled", "dead-letter"].includes(delivery.status) ||
            !delivery.purgeAt
        )
      )
        return;
      const purgeAt = new Date(
        Math.max(
          this.now() + 30 * 86400000,
          ...deliveries.map((delivery) => delivery.purgeAt!.getTime())
        )
      );
      await r
        .repository<DurableOutbox>("event_outbox", KERNEL_NAMESPACE)
        .updateOne({ filter: { id: eventId, state: "materialized" } }, { purgeAt });
    });
  }
  async tick() {
    if (this.ticking) return this.ticking;
    this.ticking = (async () => {
      await this.materialize();
      const slots = (this.options.concurrency ?? 4) - this.active.size;
      for (let i = 0; i < slots && !this.closed; i++) {
        const delivery = await this.acquire();
        if (!delivery) break;
        const task = this.process(delivery)
          .catch(() => {
            this.metrics.storeFailures++;
          })
          .finally(() => this.active.delete(task));
        this.active.add(task);
      }
    })().finally(() => {
      this.ticking = undefined;
    });
    return this.ticking;
  }
  async start() {
    this.requireReady();
    if (this.timer) return;
    await this.tick();
    this.timer = setInterval(() => {
      void this.tick().catch(() => this.metrics.storeFailures++);
    }, this.options.pollMs ?? 1000);
    this.timer.unref();
  }
  async close() {
    this.closed = true;
    clearInterval(this.timer);
    await this.ticking;
    await Promise.allSettled([...this.active]);
  }
  async list(
    input: {
      ownerPluginId?: string;
      consumerPluginId?: string;
      eventId?: string;
      status?: DeliveryStatus;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<readonly DurableDelivery[]> {
    const { limit = 100, offset = 0, ...filter } = input;
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 10000
    )
      throw new Error("Invalid delivery pagination");
    return this.repository<DurableDelivery>("event_deliveries").findMany({
      filter,
      limit,
      offset,
      sort: { createdAt: "asc", id: "asc" }
    });
  }
  async get(id: string): Promise<DurableDelivery | null> {
    return this.repository<DurableDelivery>("event_deliveries").findOne({ filter: { id } });
  }
  async decide(
    id: string,
    action: "retry" | "cancel",
    expectedEpoch: number,
    actorId: string,
    reason: string
  ) {
    if (
      !actorId.trim() ||
      !reason.trim() ||
      reason.length > 500 ||
      !Number.isSafeInteger(expectedEpoch)
    )
      throw new Error("Operator, reason and epoch required");
    await this.uow.run([KERNEL_NAMESPACE], async (r) => {
      const repo = r.repository<DurableDelivery>("event_deliveries", KERNEL_NAMESPACE);
      const current = await repo.findOne({ filter: { id } });
      if (
        !current ||
        current.epoch !== expectedEpoch ||
        current.status === "succeeded" ||
        (current.status === "running" && (current.leaseUntil?.getTime() ?? 0) > this.now()) ||
        (current.purgeAt && current.purgeAt.getTime() <= this.now())
      )
        throw new DurableDeliveryConflictError(
          "Delivery decision conflicts with active lease, completed inbox or retention"
        );
      if (
        action === "retry" &&
        (await r.repository<Inbox>("event_inbox", KERNEL_NAMESPACE).findOne({
          filter: {
            eventId: current.eventId,
            consumerPluginId: current.consumerPluginId,
            handlerName: current.handlerName
          }
        }))
      )
        throw new DurableDeliveryConflictError(
          "Inbox already completed; a new domain intent is required"
        );
      await repo.updateOne(
        { filter: { id, epoch: expectedEpoch, status: current.status } },
        {
          status: action === "retry" ? "pending" : "cancelled",
          epoch: current.epoch + 1,
          attempt: action === "retry" ? 0 : current.attempt,
          availableAt: new Date(this.now()),
          reason: "operator-decision",
          purgeAt: action === "cancel" ? new Date(this.now() + 30 * 86400000) : undefined
        }
      );
      if (action === "retry")
        await r
          .repository<DurableOutbox>("event_outbox", KERNEL_NAMESPACE)
          .updateOne({ filter: { id: current.eventId } }, { purgeAt: undefined });
      await r.repository("platform_audit", KERNEL_NAMESPACE).insertOne({
        id: randomUUID(),
        owner: current.ownerPluginId,
        at: new Date(this.now()),
        actorKind: "user",
        actorId,
        instanceId: this.options.instanceId,
        action: `delivery.${action}`,
        resourceId: id,
        outcome: "allowed",
        reason,
        epoch: current.epoch + 1,
        purgeAt: new Date(this.now() + 90 * 86400000)
      });
    });
    const result = await this.get(id);
    if (result && action === "cancel") await this.releaseCompletedOutbox(result.eventId);
    return result;
  }
  async readiness() {
    try {
      if (!this.isInitialized() || !this.timer || this.pausedConsumers.size)
        return { ok: false, reason: "durable-worker-unavailable" };
      const additional = await this.host.additionalReadiness?.();
      if (additional && !additional.ok) return additional;
      if (!(await this.adapter.healthCheck()).ok)
        return { ok: false, reason: "durable-store-unavailable" };
      const oldest = await this.repository<DurableDelivery>("event_deliveries").findOne({
        filter: {
          status: { $in: ["pending", "retry", "blocked", "running", "dead-letter"] },
          availableAt: { $lte: new Date(this.now()) }
        },
        sort: { createdAt: "asc" }
      });
      return oldest && oldest.createdAt.getTime() < this.now() - 300000
        ? { ok: false, reason: "durable-backlog-age" }
        : { ok: true };
    } catch {
      this.metrics.storeFailures++;
      return { ok: false, reason: "durable-store-unavailable" };
    }
  }
}
