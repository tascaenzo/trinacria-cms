import type { ApplicationContext } from "@trinacria/core";
import type { DbAdapter, DbQuery, DbRepository } from "../../contracts/db-adapter.js";
import type {
  PluginHostServices,
  PluginJsonValue,
  PluginStorage
} from "../../contracts/plugin-host-services.js";
import type { PluginManifest } from "../../contracts/plugin-manifest.js";
import type { PluginEventPublisher } from "../../contracts/plugin-runtime.js";
import type {
  ClaimSecureEventPayloadInput,
  CreateSecureEventPayloadInput
} from "../../contracts/secure-event-payloads.js";
import { PluginRuntimeError } from "../../errors/plugin-errors.js";
import { CORE_TOKENS } from "../../tokens/core-tokens.js";
import { createPluginOperationContext } from "../operations/operation-context.js";
import { PLUGIN_OPERATIONS_PROVIDER_KIND } from "./plugin-operation-provider.js";

export function copyPluginJson(value: unknown): PluginJsonValue {
  const visit = (item: unknown, depth: number): PluginJsonValue => {
    if (depth > 32) throw new PluginRuntimeError("Plugin JSON nesting limit exceeded");
    if (item === null || typeof item === "string" || typeof item === "boolean") return item;
    if (typeof item === "number" && Number.isFinite(item)) return item;
    if (Array.isArray(item)) return item.map((child) => visit(child, depth + 1));
    if (
      item &&
      typeof item === "object" &&
      [Object.prototype, null].includes(Object.getPrototypeOf(item))
    ) {
      return Object.fromEntries(
        Object.entries(item).map(([key, child]) => {
          if (["__proto__", "prototype", "constructor"].includes(key))
            throw new PluginRuntimeError("Unsafe plugin JSON key");
          return [key, visit(child, depth + 1)];
        })
      );
    }
    throw new PluginRuntimeError("Plugin operations require JSON values");
  };
  const result = visit(value, 0);
  if (Buffer.byteLength(JSON.stringify(result)) > 1024 * 1024)
    throw new PluginRuntimeError("Plugin JSON size limit exceeded");
  return result;
}

export function createPluginHostServices(options: {
  app?: ApplicationContext;
  manifest: PluginManifest;
  events: PluginEventPublisher;
  assertActive: () => void;
  ownerManifest: (id: string) => PluginManifest | undefined;
  ownerLoaded: (id: string) => boolean;
  ownerEvents: (id: string) => PluginEventPublisher;
  runOperation?: <T>(ownerId: string, work: (signal: AbortSignal) => Promise<T>) => Promise<T>;
  storageAdapter?: DbAdapter;
  storageTransaction?: <T>(
    work: (adapter: DbAdapter, events: PluginEventPublisher) => Promise<T>
  ) => Promise<T>;
}): PluginHostServices {
  const { app, manifest, assertActive } = options;
  const pluginId = manifest.id;
  const requireApp = () => {
    assertActive();
    if (!app) throw new PluginRuntimeError("Plugin host service is not available", { pluginId });
    return app;
  };
  const storage = (adapter?: DbAdapter): PluginStorage =>
    Object.freeze({
      repository<T>(entityName: string): DbRepository<T> {
        assertActive();
        if (!(manifest.entities ?? []).some((entity) => entity.name === entityName)) {
          throw new PluginRuntimeError("Plugin entity is not declared", { pluginId, entityName });
        }
        let repository: Promise<DbRepository<T>> | undefined;
        const resolve = () =>
          (repository ??= (async () => {
            const db = adapter ?? (await requireApp().resolve(CORE_TOKENS.DB_ADAPTER));
            return db.repository<T>(entityName, { pluginId });
          })());
        const query = (input: DbQuery<T>, many = false): DbQuery<T> => {
          if (input.metadata !== undefined)
            throw new PluginRuntimeError("Adapter metadata is host-only");
          const limit = input.limit ?? (many ? 100 : undefined);
          if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100))
            throw new PluginRuntimeError("Plugin query limit must be 1–100");
          if (input.offset !== undefined && (!Number.isInteger(input.offset) || input.offset < 0))
            throw new PluginRuntimeError("Plugin query offset is invalid");
          return { ...input, limit };
        };
        return Object.freeze({
          async findOne(input) {
            assertActive();
            const normalized = query(input);
            const repo = await resolve();
            assertActive();
            return repo.findOne(normalized);
          },
          async findMany(input) {
            assertActive();
            const normalized = query(input, true);
            const repo = await resolve();
            assertActive();
            return repo.findMany(normalized);
          },
          async insertOne(data) {
            assertActive();
            const repo = await resolve();
            assertActive();
            return repo.insertOne(data);
          },
          async updateOne(input, patch) {
            assertActive();
            const normalized = query(input);
            const repo = await resolve();
            assertActive();
            return repo.updateOne(normalized, patch);
          },
          async deleteOne(input) {
            assertActive();
            const normalized = query(input);
            const repo = await resolve();
            assertActive();
            return repo.deleteOne(normalized);
          }
        } satisfies DbRepository<T>);
      },
      async transaction<T>(
        work: (storage: PluginStorage, events: PluginEventPublisher) => Promise<T>
      ): Promise<T> {
        assertActive();
        if (adapter) throw new PluginRuntimeError("Nested plugin transactions are not supported");
        if (options.storageTransaction)
          return options.storageTransaction((scoped, events) => work(storage(scoped), events));
        const db = await requireApp().resolve(CORE_TOKENS.DB_ADAPTER);
        assertActive();
        if (!db.withTransaction)
          throw new PluginRuntimeError("Transactional storage is unavailable");
        return db.withTransaction({ pluginId }, async (scoped) => {
          assertActive();
          return work(storage(scoped), options.events);
        });
      }
    });
  const setting = (key: string) => {
    assertActive();
    if (
      !key.startsWith(`${pluginId}:`) ||
      !(manifest.settings ?? []).some((item) => item.key === key)
    ) {
      throw new PluginRuntimeError("Plugin setting is not owned or declared", { pluginId });
    }
  };
  const log = async (
    level: "info" | "warn" | "error",
    message: string,
    metadata?: Record<string, unknown>
  ) => {
    assertActive();
    const fields = Object.fromEntries(
      Object.entries(metadata ?? {})
        .filter(([key]) =>
          ["action", "resourceId", "requestId", "outcome", "reason", "durationMs"].includes(key)
        )
        .filter(
          ([, value]) =>
            typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        )
        .map(([key, value]) => [key, typeof value === "string" ? redact(value) : value])
    );
    const logger = app?.hasToken(CORE_TOKENS.LOGGER)
      ? await app.resolve(CORE_TOKENS.LOGGER)
      : console;
    assertActive();
    logger[level](redact(message), { ...fields, pluginId });
  };
  const securePayloadClient = async () => {
    const host = await requireApp().resolve(CORE_TOKENS.SECURE_EVENT_PAYLOAD_HOST);
    assertActive();
    return host.forPlugin(pluginId);
  };
  return Object.freeze({
    storage: storage(options.storageAdapter),
    securePayloads: Object.freeze({
      async create<T>(input: CreateSecureEventPayloadInput<T>) {
        const client = await securePayloadClient();
        return client.create(input);
      },
      async claim<T>(input: ClaimSecureEventPayloadInput) {
        const client = await securePayloadClient();
        return client.claim<T>(input);
      },
      async revoke(payloadId: string) {
        const client = await securePayloadClient();
        return client.revoke(payloadId);
      }
    }),
    events: Object.freeze({
      async emit(name, payload, input) {
        assertActive();
        await options.events.emit(name, payload, input);
      }
    } satisfies PluginEventPublisher),
    settings: Object.freeze({
      async get(key: string) {
        setting(key);
        const host = await requireApp().resolve(CORE_TOKENS.PLUGIN_SETTINGS_HOST);
        assertActive();
        return copyPluginJson(await host.get(pluginId, key));
      },
      async set(key: string, value: PluginJsonValue) {
        setting(key);
        const input = copyPluginJson(value);
        const host = await requireApp().resolve(CORE_TOKENS.PLUGIN_SETTINGS_HOST);
        assertActive();
        await host.set(pluginId, key, input);
      }
    }),
    logger: Object.freeze({
      info: (message: string, fields?: Record<string, unknown>) => log("info", message, fields),
      warn: (message: string, fields?: Record<string, unknown>) => log("warn", message, fields),
      error: (message: string, fields?: Record<string, unknown>) => log("error", message, fields)
    }),
    operations: Object.freeze({
      async call<T>(
        ownerPluginId: string,
        name: string,
        input: PluginJsonValue = null,
        request?: { signal?: AbortSignal }
      ): Promise<T> {
        const invoke = async (activitySignal?: AbortSignal): Promise<T> => {
          const signal =
            activitySignal && request?.signal
              ? AbortSignal.any([activitySignal, request.signal])
              : (activitySignal ?? request?.signal);
          const host = requireApp();
          signal?.throwIfAborted();
          if (ownerPluginId !== pluginId && !options.ownerLoaded(ownerPluginId))
            throw new PluginRuntimeError("Operation owner is not loaded");
          const ownerEvents = options.ownerEvents(ownerPluginId);
          const matches = [];
          for (const provider of host.getProvidersByKind(PLUGIN_OPERATIONS_PROVIDER_KIND)) {
            const registered = await host.resolve(provider.token);
            assertActive();
            if (registered.ownerPluginId === ownerPluginId)
              matches.push(...registered.operations.filter((operation) => operation.name === name));
          }
          if (matches.length !== 1)
            throw new PluginRuntimeError("Plugin operation is missing or ambiguous", {
              ownerPluginId,
              operation: name
            });
          const operation = matches[0]!;
          if (ownerPluginId !== pluginId) {
            const permission = operation.requiredPermission;
            if (
              operation.private ||
              !permission ||
              !(options.ownerManifest(ownerPluginId)?.security?.permissions ?? []).some(
                (item) => item.key === permission
              ) ||
              !permission.startsWith(`${ownerPluginId}:`)
            )
              throw new PluginRuntimeError("Plugin operation access denied");
            if (!host.hasToken(CORE_TOKENS.PLUGIN_OPERATION_AUTHORIZER))
              throw new PluginRuntimeError("Plugin operation policy is required");
            let allowed = false;
            try {
              const policy = await host.resolve(CORE_TOKENS.PLUGIN_OPERATION_AUTHORIZER);
              const decision = await policy.canInvoke({
                callerPluginId: pluginId,
                ownerPluginId,
                operation: name,
                requiredPermission: permission
              });
              allowed = decision?.allowed === true;
            } catch {
              throw new PluginRuntimeError("Plugin operation policy failed", {
                reason: "plugin_operation_policy_error"
              });
            }
            if (!allowed) throw new PluginRuntimeError("Plugin operation access denied");
          }
          assertActive();
          if (ownerPluginId !== pluginId && !options.ownerLoaded(ownerPluginId))
            throw new PluginRuntimeError("Operation owner is not loaded");
          if (options.ownerEvents(ownerPluginId) !== ownerEvents)
            throw new PluginRuntimeError("Operation owner generation is inactive");
          signal?.throwIfAborted();
          const parsed = operation.input.parse(copyPluginJson(input));
          const result = await operation.invoke(parsed, {
            operationContext: createPluginOperationContext(pluginId, "plugin", undefined, name),
            callerPluginId: pluginId,
            ownerPluginId,
            signal,
            events: ownerEvents
          });
          assertActive();
          return copyPluginJson(result ?? null) as T;
        };
        return options.runOperation ? options.runOperation(ownerPluginId, invoke) : invoke();
      }
    })
  });
}
function redact(value: string): string {
  return value
    .slice(0, 1000)
    .replace(
      /(?:https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:password|token|secret|signature|authorization)\s*[:=]\s*\S+)/gi,
      "[redacted]"
    );
}
