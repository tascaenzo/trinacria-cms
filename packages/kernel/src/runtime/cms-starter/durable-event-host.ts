import { randomUUID } from "node:crypto";
import { factoryProvider, type TrinacriaApp } from "@trinacria/core";
import type { CmsStarterOptions } from "../../contracts/cms-starter.js";
import type {
  ClaimSecureEventPayloadInput,
  SecureEventPayloadReadyEvent
} from "../../contracts/secure-event-payloads.js";
import { CORE_TOKENS } from "../../tokens/core-tokens.js";
import {
  type DurableDelivery,
  DurableDeliveryBlockedError,
  type DurableOutbox,
  MongoDurableEventStore
} from "../durable-events/durable-events.js";
import { SecureEmailJobStore } from "../durable-events/secure-email-jobs.js";
import { MongoDbAdapter } from "../persistence/mongo-db-adapter.js";
import type { InMemoryPluginRuntime } from "../plugin-runtime/in-memory-plugin-runtime.js";
import {
  readSecurePayloadKeyring,
  SecureEventPayloadCrypto
} from "../secure-payloads/secure-event-payloads.crypto.js";
import { SecureEventPayloadsService } from "../secure-payloads/secure-event-payloads.service.js";

export function registerDurableEventHost(app: TrinacriaApp, options: CmsStarterOptions) {
  let store: MongoDurableEventStore | undefined, jobs: SecureEmailJobStore | undefined;
  const custom = app.hasToken(CORE_TOKENS.DURABLE_EVENTS);
  if (!custom)
    app.registerGlobalProvider(
      factoryProvider(
        CORE_TOKENS.DURABLE_EVENTS,
        () =>
          new Proxy({} as MongoDurableEventStore, {
            get(_target, property) {
              if (property === "isInitialized") return () => store?.isInitialized() ?? false;
              if (typeof Reflect.get(MongoDurableEventStore.prototype, property) !== "function")
                return undefined;
              return (...args: unknown[]) => {
                if (!store)
                  return Promise.reject(new Error("Durable event host is not initialized"));
                return Reflect.get(store, property).apply(store, args);
              };
            }
          }),
        []
      )
    );
  if (!app.hasToken(CORE_TOKENS.SECURE_EMAIL_JOBS))
    app.registerGlobalProvider(
      factoryProvider(
        CORE_TOKENS.SECURE_EMAIL_JOBS,
        () =>
          new Proxy({} as SecureEmailJobStore, {
            get(_target, property) {
              if (typeof Reflect.get(SecureEmailJobStore.prototype, property) !== "function")
                return undefined;
              return (...args: unknown[]) => {
                if (!jobs)
                  return Promise.reject(
                    Object.assign(new Error("Secure email jobs unavailable"), {
                      code: "platform_maintenance"
                    })
                  );
                return Reflect.get(jobs, property).apply(jobs, args);
              };
            }
          }),
        []
      )
    );
  return {
    async initialize(runtime: InMemoryPluginRuntime) {
      if (custom) {
        store = await app.resolve(CORE_TOKENS.DURABLE_EVENTS);
        runtime.setDurableEventStore(store);
        return;
      }
      if (!app.hasToken(CORE_TOKENS.DB_ADAPTER) || options.durableEvents?.enabled === false) return;
      const adapter = await app.resolve(CORE_TOKENS.DB_ADAPTER);
      if (!(adapter instanceof MongoDbAdapter) || !(await adapter.healthCheck()).ok) return;
      const registry = await app.resolve(CORE_TOKENS.ENTITY_REGISTRY);
      const instanceId = options.cluster?.instanceId ?? randomUUID();
      if (runtime.list().some((record) => record.manifest.id === "email-pack")) {
        const vault = await app.resolve(CORE_TOKENS.SECURE_EVENT_PAYLOAD_HOST);
        if (!(vault instanceof SecureEventPayloadsService))
          throw new Error("Durable email requires the transactional Mongo vault host");
        jobs = new SecureEmailJobStore(
          adapter,
          registry,
          vault,
          new SecureEventPayloadCrypto(
            options.securePayloads?.keyring ?? readSecurePayloadKeyring()
          ),
          {
            canSend: (job) => runtime.canSendSecureEmailJob(job),
            send: async (payload, context) => {
              context.signal.throwIfAborted();
              await runtime.sendSecureEmailJob(payload, context.messageId);
            }
          },
          { instanceId, pollMs: options.durableEvents?.pollMs }
        );
        await jobs.initialize();
      }
      const claim = (
        delivery: DurableDelivery,
        outbox: DurableOutbox
      ): ClaimSecureEventPayloadInput => {
        const notification = outbox.payload as SecureEventPayloadReadyEvent;
        if (
          !notification ||
          typeof notification.securePayloadId !== "string" ||
          notification.payloadType !== "email-pack:send-email-request" ||
          notification.schemaVersion !== 1
        )
          throw new DurableDeliveryBlockedError("contract-mismatch");
        return {
          payloadId: notification.securePayloadId,
          eventName: delivery.eventName,
          payloadType: notification.payloadType,
          schemaVersion: 1,
          requiredPermission: "email-pack:email:send"
        };
      };
      store = new MongoDurableEventStore(
        adapter,
        registry,
        {
          additionalReadiness: () => (jobs ? jobs.readiness() : Promise.resolve({ ok: true })),
          describe: (owner, name, payload) =>
            runtime.describeDurablePublication(owner, name, payload),
          assertConsumerActive: (id) => runtime.assertDurableConsumerActive(id),
          async beforeDispatch(delivery, outbox) {
            if (delivery.consumerPluginId !== "email-pack") return;
            if (!jobs) throw new DurableDeliveryBlockedError("handler-missing");
            try {
              await jobs.preflightClaim(delivery, claim(delivery, outbox));
            } catch (error) {
              if (error instanceof DurableDeliveryBlockedError) throw error;
              throw new DurableDeliveryBlockedError("policy-denied");
            }
          },
          dispatch: (delivery, outbox, adapter, signal, publisher, repositories) =>
            runtime.dispatchDurableEvent(
              delivery,
              outbox,
              adapter,
              signal,
              publisher,
              delivery.consumerPluginId === "email-pack" && jobs
                ? {
                    enqueueFromPayload: async (input) => {
                      if (
                        (
                          Object.keys(
                            claim(delivery, outbox)
                          ) as (keyof ClaimSecureEventPayloadInput)[]
                        ).some((key) => input[key] !== claim(delivery, outbox)[key])
                      )
                        throw new DurableDeliveryBlockedError("contract-mismatch");
                      return jobs!.transfer(repositories, delivery, input);
                    }
                  }
                : undefined
            )
        },
        {
          instanceId,
          concurrency: options.durableEvents?.concurrency,
          pollMs: options.durableEvents?.pollMs
        }
      );
      await store.initialize();
      runtime.setDurableEventStore(store);
    },
    async start() {
      await store?.start();
      await jobs?.start();
    },
    async close() {
      await store?.close();
      await jobs?.close();
    }
  };
}
