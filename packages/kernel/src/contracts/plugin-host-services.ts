import type { DbQuery } from "./db-adapter.js";
import type { PluginEventPublisher } from "./plugin-runtime.js";
import type { SecureEventPayloadClient } from "./secure-event-payloads.js";

export type PluginJsonValue =
  | null
  | boolean
  | number
  | string
  | PluginJsonValue[]
  | { [key: string]: PluginJsonValue };
export type PluginQuery<T = unknown> = Omit<DbQuery<T>, "metadata">;
export interface PluginRepository<T = unknown> {
  findOne(query: PluginQuery<T>): Promise<T | null>;
  findMany(query: PluginQuery<T>): Promise<readonly T[]>;
  insertOne(data: Partial<T>): Promise<T>;
  updateOne(query: PluginQuery<T>, patch: Partial<T>): Promise<T | null>;
  deleteOne(query: PluginQuery<T>): Promise<boolean>;
}
export interface PluginStorage {
  repository<T = unknown>(entityName: string): PluginRepository<T>;
  transaction<T>(
    work: (storage: PluginStorage, events: PluginEventPublisher) => Promise<T>
  ): Promise<T>;
}
export interface PluginSettings {
  get(key: string): Promise<PluginJsonValue | null>;
  set(key: string, value: PluginJsonValue): Promise<void>;
}
export interface PluginLogger {
  info(message: string, metadata?: Record<string, unknown>): Promise<void>;
  warn(message: string, metadata?: Record<string, unknown>): Promise<void>;
  error(message: string, metadata?: Record<string, unknown>): Promise<void>;
}
export interface PluginOperationClient {
  call<T = PluginJsonValue>(
    ownerPluginId: string,
    operation: string,
    input?: PluginJsonValue,
    options?: { signal?: AbortSignal }
  ): Promise<T>;
}
export interface PluginHostServices {
  readonly storage: PluginStorage;
  readonly securePayloads: SecureEventPayloadClient;
  readonly settings: PluginSettings;
  readonly events: PluginEventPublisher;
  readonly logger: PluginLogger;
  readonly operations: PluginOperationClient;
}

/** Host integration points. Callers' identities are supplied by the runtime. */
export interface PluginSettingsHost {
  get(pluginId: string, key: string): Promise<PluginJsonValue | null>;
  set(pluginId: string, key: string, value: PluginJsonValue): Promise<void>;
}
export interface PluginOperationAuthorizationRequest {
  callerPluginId: string;
  ownerPluginId: string;
  operation: string;
  requiredPermission: string;
}
export interface PluginOperationAuthorizer {
  canInvoke(
    request: PluginOperationAuthorizationRequest
  ): Promise<{ allowed: boolean }> | { allowed: boolean };
}
