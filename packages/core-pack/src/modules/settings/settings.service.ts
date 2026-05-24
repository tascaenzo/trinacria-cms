import { createHash } from "node:crypto";
import { assertRequesterOwnsSettingKey, getOwnerPluginIdFromSettingKey } from "./_shared/settings-key.js";
import {
  cloneJsonValue,
  parseJsonValue,
  type JsonValue
} from "./_shared/settings-json.js";
import {
  SettingsDefinitionsRepository,
  type UpsertSettingDefinitionRecordInput
} from "./definitions/settings-definitions.repository.js";
import {
  SettingsValuesRepository,
  type UpsertSettingValueRecordInput
} from "./values/settings-values.repository.js";
import {
  SettingsSecretsRepository,
  type UpsertSettingSecretRecordInput
} from "./secrets/settings-secrets.repository.js";
import { SettingsSecretsCryptoService } from "./secrets/settings-secrets-crypto.service.js";
import { SettingsAuditRepository } from "./audit/settings-audit.repository.js";
import type { SettingAuditAction } from "./schemas/settings-audit.schemas.js";
import {
  SettingsAccessError,
  createSettingsOwnerAccessError
} from "./_shared/settings.errors.js";

export interface SettingsDefinition {
  id: string;
  key: string;
  ownerPluginId: string;
  category?: string;
  description?: string;
  schema?: JsonValue;
  defaultValue?: JsonValue;
  visibility: "public" | "admin" | "internal";
  mutable: boolean;
  secret: boolean;
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
}

export interface SettingValue {
  id: string;
  key: string;
  ownerPluginId: string;
  value: JsonValue;
  version: number;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettingSecretMetadata {
  id: string;
  key: string;
  ownerPluginId: string;
  algorithm: "aes-256-gcm";
  keyVersion: string;
  maskedValue: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedSettingValue {
  key: string;
  ownerPluginId: string;
  value: JsonValue;
  source: "value" | "default";
  version?: number;
  updatedAt: string;
}

export interface SettingsObservabilitySnapshot {
  reads: number;
  writes: number;
  denies: number;
  errors: number;
}

export interface ExportedPluginSettings {
  pluginId: string;
  definitions: readonly SettingsDefinition[];
  values: readonly SettingValue[];
  secrets: readonly SettingSecretMetadata[];
}

/**
 * Application service for settings definitions, values and encrypted secrets.
 */
export class SettingsService {
  private readonly metrics: SettingsObservabilitySnapshot = {
    reads: 0,
    writes: 0,
    denies: 0,
    errors: 0
  };

  constructor(
    private readonly definitions: SettingsDefinitionsRepository,
    private readonly values: SettingsValuesRepository,
    private readonly secrets: SettingsSecretsRepository,
    private readonly crypto: SettingsSecretsCryptoService,
    private readonly audit?: SettingsAuditRepository
  ) {}

  async upsertDefinition(input: {
    requesterPluginId: string;
    key: string;
    category?: string;
    description?: string;
    schema?: unknown;
    defaultValue?: unknown;
    visibility?: "public" | "admin" | "internal";
    mutable?: boolean;
    secret?: boolean;
    status?: "active" | "disabled";
  }): Promise<SettingsDefinition> {
    try {
      assertRequesterOwnsSettingKey(input.requesterPluginId, input.key, "write definition");

      const existing = await this.definitions.findByKey(input.key);
      const record = await this.definitions.upsert({
        key: input.key,
        ownerPluginId: getOwnerPluginIdFromSettingKey(input.key),
        category: input.category,
        description: input.description,
        ...(input.schema !== undefined
          ? { schema: parseJsonValue(input.schema) }
          : {}),
        ...(input.defaultValue !== undefined
          ? { defaultValue: parseJsonValue(input.defaultValue) }
          : {}),
        visibility: input.visibility,
        mutable: input.mutable,
        secret: input.secret,
        status: input.status
      } satisfies UpsertSettingDefinitionRecordInput);

      await this.emitAudit({
        key: input.key,
        action: "definition_upsert",
        actor: input.requesterPluginId,
        oldHash: existing ? this.hashJson(existing.defaultValue) : undefined,
        newMetadata: {
          description: input.description,
          category: input.category,
          hadDefault: input.defaultValue !== undefined
        }
      });

      this.metrics.writes += 1;
      return this.toDefinition(record);
    } catch (error) {
      this.trackFailure(error);
      throw error;
    }
  }

  async getDefinitionByKey(key: string): Promise<SettingsDefinition | null> {
    try {
      const record = await this.definitions.findByKey(key);
      if (record) this.metrics.reads += 1;
      return record ? this.toDefinition(record) : null;
    } catch (error) {
      this.trackFailure(error);
      throw error;
    }
  }

  async listDefinitions(options?: {
    ownerPluginId?: string;
    limit?: number;
    offset?: number;
  }): Promise<readonly SettingsDefinition[]> {
    try {
      const records = await this.definitions.list(options);
      this.metrics.reads += 1;
      return records.map((record) => this.toDefinition(record));
    } catch (error) {
      this.trackFailure(error);
      throw error;
    }
  }

  async upsertValue(input: {
    requesterPluginId: string;
    key: string;
    value: unknown;
    updatedBy?: string;
  }): Promise<SettingValue> {
    try {
      assertRequesterOwnsSettingKey(input.requesterPluginId, input.key, "write value");
      const definition = await this.getActiveDefinitionForWrite(input.key, "write value");
      if (definition.secret) {
        this.metrics.denies += 1;
        throw new Error(`Setting "${input.key}" is secret and cannot be written via value endpoint`);
      }
      if (!definition.mutable) {
        this.metrics.denies += 1;
        throw new Error(`Setting "${input.key}" is immutable`);
      }
      const parsedValue = parseJsonValue(input.value);

      const existing = await this.values.findByKey(input.key);
      const record = await this.values.upsert({
        key: input.key,
        ownerPluginId: getOwnerPluginIdFromSettingKey(input.key),
        value: parsedValue,
        updatedBy: input.updatedBy
      } satisfies UpsertSettingValueRecordInput);

      await this.emitAudit({
        key: input.key,
        action: "value_upsert",
        actor: input.updatedBy || input.requesterPluginId,
        oldHash: existing ? this.hashJson(existing.value) : undefined,
        newMetadata: {
          hadValue: true
        }
      });

      this.metrics.writes += 1;
      return this.toSettingValue(record);
    } catch (error) {
      this.trackFailure(error);
      throw error;
    }
  }

  async getResolvedValueByKey(key: string): Promise<ResolvedSettingValue | null> {
    try {
      const value = await this.values.findByKey(key);
      if (value) {
        this.metrics.reads += 1;
        return {
          key: value.key,
          ownerPluginId: value.ownerPluginId,
          value: cloneJsonValue(value.value),
          source: "value",
          version: value.version,
          updatedAt: value.updatedAt
        };
      }

      const definition = await this.definitions.findByKey(key);
      if (!definition || definition.defaultValue === undefined) {
        return null;
      }
      this.metrics.reads += 1;
      return {
        key: definition.key,
        ownerPluginId: definition.ownerPluginId,
        value: cloneJsonValue(definition.defaultValue),
        source: "default",
        updatedAt: definition.updatedAt
      };
    } catch (error) {
      this.trackFailure(error);
      throw error;
    }
  }

  async getResolvedValueForPlugin(
    requesterPluginId: string,
    key: string
  ): Promise<ResolvedSettingValue | null> {
    const normalizedRequester = requesterPluginId.trim().toLowerCase();
    const definition = await this.definitions.findByKey(key);
    if (!definition || definition.status !== "active") {
      return null;
    }
    if (definition.secret) {
      this.metrics.denies += 1;
      throw createSettingsOwnerAccessError({
        action: "read secret value",
        key,
        requesterPluginId: normalizedRequester,
        ownerPluginId: definition.ownerPluginId
      });
    }
    if (definition.visibility !== "public" && definition.ownerPluginId !== normalizedRequester) {
      this.metrics.denies += 1;
      throw createSettingsOwnerAccessError({
        action: "read value",
        key,
        requesterPluginId: normalizedRequester,
        ownerPluginId: definition.ownerPluginId
      });
    }
    return this.getResolvedValueByKey(key);
  }

  async listDefinitionsForPlugin(
    requesterPluginId: string,
    options?: { ownerPluginId?: string; limit?: number; offset?: number }
  ): Promise<readonly SettingsDefinition[]> {
    const normalizedRequester = requesterPluginId.trim().toLowerCase();
    const ownerFilter = options?.ownerPluginId?.trim().toLowerCase();
    if (ownerFilter && ownerFilter !== normalizedRequester) {
      this.metrics.denies += 1;
      throw createSettingsOwnerAccessError({
        action: "list definitions",
        key: `${ownerFilter}:*`,
        requesterPluginId: normalizedRequester,
        ownerPluginId: ownerFilter
      });
    }
    return this.listDefinitions({
      ownerPluginId: ownerFilter ?? normalizedRequester,
      limit: options?.limit,
      offset: options?.offset
    });
  }

  async getDefinitionByKeyForPlugin(
    requesterPluginId: string,
    key: string
  ): Promise<SettingsDefinition | null> {
    const definition = await this.getDefinitionByKey(key);
    if (!definition || definition.status !== "active") {
      return null;
    }
    const normalizedRequester = requesterPluginId.trim().toLowerCase();
    if (definition.visibility !== "public" && definition.ownerPluginId !== normalizedRequester) {
      this.metrics.denies += 1;
      throw createSettingsOwnerAccessError({
        action: "read definition",
        key,
        requesterPluginId: normalizedRequester,
        ownerPluginId: definition.ownerPluginId
      });
    }
    return definition;
  }

  async upsertSecret(input: {
    requesterPluginId: string;
    key: string;
    plaintext: string;
    updatedBy?: string;
  }): Promise<SettingSecretMetadata> {
    try {
      assertRequesterOwnsSettingKey(input.requesterPluginId, input.key, "write secret");
      const definition = await this.getActiveDefinitionForWrite(input.key, "write secret");
      if (!definition.secret) {
        this.metrics.denies += 1;
        throw new Error(`Setting "${input.key}" is not a secret setting`);
      }
      if (!definition.mutable) {
        this.metrics.denies += 1;
        throw new Error(`Setting "${input.key}" is immutable`);
      }

      const existing = await this.secrets.findByKey(input.key);
      const encrypted = this.crypto.encrypt(input.plaintext);
      const record = await this.secrets.upsert({
        key: input.key,
        ownerPluginId: getOwnerPluginIdFromSettingKey(input.key),
        cipherText: encrypted.cipherText,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        algorithm: encrypted.algorithm,
        keyVersion: encrypted.keyVersion,
        updatedBy: input.updatedBy
      } satisfies UpsertSettingSecretRecordInput);

      await this.emitAudit({
        key: input.key,
        action: "secret_upsert",
        actor: input.updatedBy || input.requesterPluginId,
        oldHash: existing ? this.hashJson({ keyVersion: existing.keyVersion }) : undefined,
        newMetadata: {
          hadValue: true
        }
      });

      this.metrics.writes += 1;
      return this.toSecretMetadata(record);
    } catch (error) {
      this.trackFailure(error);
      throw error;
    }
  }

  async getSecretMetadata(
    requesterPluginId: string,
    key: string
  ): Promise<SettingSecretMetadata | null> {
    const metadata = await this.getSecretMetadataByKey(key);
    if (!metadata) return null;

    const normalizedRequester = requesterPluginId.trim().toLowerCase();
    if (metadata.ownerPluginId !== normalizedRequester) {
      this.metrics.denies += 1;
      throw createSettingsOwnerAccessError({
        action: "read secret metadata",
        key,
        requesterPluginId: normalizedRequester,
        ownerPluginId: metadata.ownerPluginId
      });
    }

    this.metrics.reads += 1;
    return metadata;
  }

  async getSecretMetadataByKey(key: string): Promise<SettingSecretMetadata | null> {
    const definition = await this.definitions.findByKey(key);
    if (!definition || !definition.secret || definition.status !== "active") {
      return null;
    }
    const record = await this.secrets.findByKey(key);
    if (!record) return null;

    this.metrics.reads += 1;
    return this.toSecretMetadata(record);
  }

  async revealSecret(
    requesterPluginId: string,
    key: string
  ): Promise<{ key: string; value: string } | null> {
    const record = await this.secrets.findByKey(key);
    if (!record) return null;

    const normalizedRequester = requesterPluginId.trim().toLowerCase();
    if (record.ownerPluginId !== normalizedRequester) {
      this.metrics.denies += 1;
      throw createSettingsOwnerAccessError({
        action: "reveal secret",
        key,
        requesterPluginId: normalizedRequester,
        ownerPluginId: record.ownerPluginId
      });
    }

    this.metrics.reads += 1;
    return {
      key: record.key,
      value: this.crypto.decrypt(record)
    };
  }

  async exportPluginSettings(
    requesterPluginId: string,
    pluginId: string
  ): Promise<ExportedPluginSettings> {
    const normalizedRequester = requesterPluginId.trim().toLowerCase();
    const normalizedPluginId = pluginId.trim().toLowerCase();
    if (normalizedRequester !== normalizedPluginId) {
      this.metrics.denies += 1;
      throw createSettingsOwnerAccessError({
        action: "export settings",
        key: `${normalizedPluginId}:*`,
        requesterPluginId: normalizedRequester,
        ownerPluginId: normalizedPluginId
      });
    }

    const [definitions, values, secrets] = await Promise.all([
      this.listDefinitions({ ownerPluginId: normalizedPluginId }),
      this.values.listByOwnerPlugin(normalizedPluginId),
      this.secrets.listByOwnerPlugin(normalizedPluginId)
    ]);

    this.metrics.reads += 1;
    return {
      pluginId: normalizedPluginId,
      definitions,
      values: values.map((item) => this.toSettingValue(item)),
      secrets: secrets.map((item) => this.toSecretMetadata(item))
    };
  }

  getObservabilitySnapshot(): SettingsObservabilitySnapshot {
    return { ...this.metrics };
  }

  private toDefinition(record: {
    id: string;
    key: string;
    ownerPluginId: string;
    category?: string;
    description?: string;
    schema?: JsonValue;
    defaultValue?: JsonValue;
    visibility: "public" | "admin" | "internal";
    mutable: boolean;
    secret: boolean;
    status: "active" | "disabled";
    createdAt: string;
    updatedAt: string;
  }): SettingsDefinition {
    return {
      id: record.id,
      key: record.key,
      ownerPluginId: record.ownerPluginId,
      ...(record.category ? { category: record.category } : {}),
      ...(record.description ? { description: record.description } : {}),
      ...(record.schema !== undefined
        ? { schema: cloneJsonValue(record.schema) }
        : {}),
      ...(record.defaultValue !== undefined
        ? { defaultValue: cloneJsonValue(record.defaultValue) }
        : {}),
      visibility: record.visibility,
      mutable: record.mutable,
      secret: record.secret,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  private toSettingValue(record: {
    id: string;
    key: string;
    ownerPluginId: string;
    value: JsonValue;
    version: number;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
  }): SettingValue {
    return {
      id: record.id,
      key: record.key,
      ownerPluginId: record.ownerPluginId,
      value: cloneJsonValue(record.value),
      version: record.version,
      ...(record.updatedBy ? { updatedBy: record.updatedBy } : {}),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  private async emitAudit(input: {
    key: string;
    action: SettingAuditAction;
    actor?: string;
    oldHash?: string;
    newMetadata?: { description?: string; category?: string; hadDefault?: boolean; hadValue?: boolean };
  }): Promise<void> {
    if (!this.audit) return;
    try {
      await this.audit.record(input);
    } catch {
      // Audit failures should not break the primary operation.
    }
  }

  private hashJson(value: unknown): string {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
  }

  private toSecretMetadata(record: {
    id: string;
    key: string;
    ownerPluginId: string;
    algorithm: "aes-256-gcm";
    keyVersion: string;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
  }): SettingSecretMetadata {
    return {
      id: record.id,
      key: record.key,
      ownerPluginId: record.ownerPluginId,
      algorithm: record.algorithm,
      keyVersion: record.keyVersion,
      maskedValue: "********",
      ...(record.updatedBy ? { updatedBy: record.updatedBy } : {}),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  private async getActiveDefinitionForWrite(
    key: string,
    action: string
  ): Promise<SettingsDefinition> {
    const definition = await this.getDefinitionByKey(key);
    if (!definition || definition.status !== "active") {
      throw new Error(`Cannot ${action}: setting definition "${key}" is missing or disabled`);
    }
    return definition;
  }

  private trackFailure(error: unknown): void {
    if (error instanceof SettingsAccessError) {
      this.metrics.denies += 1;
      return;
    }
    this.metrics.errors += 1;
  }
}
