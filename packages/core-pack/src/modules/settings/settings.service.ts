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
import { createSettingsOwnerAccessError } from "./_shared/settings.errors.js";

export interface SettingsDefinition {
  id: string;
  key: string;
  ownerPluginId: string;
  category?: string;
  description?: string;
  schema?: JsonValue;
  defaultValue?: JsonValue;
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
    status?: "active" | "disabled";
  }): Promise<SettingsDefinition> {
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

    return this.toDefinition(record);
  }

  async getDefinitionByKey(key: string): Promise<SettingsDefinition | null> {
    const record = await this.definitions.findByKey(key);
    return record ? this.toDefinition(record) : null;
  }

  async listDefinitions(options?: {
    ownerPluginId?: string;
    limit?: number;
    offset?: number;
  }): Promise<readonly SettingsDefinition[]> {
    const records = await this.definitions.list(options);
    return records.map((record) => this.toDefinition(record));
  }

  async upsertValue(input: {
    requesterPluginId: string;
    key: string;
    value: unknown;
    updatedBy?: string;
  }): Promise<SettingValue> {
    assertRequesterOwnsSettingKey(input.requesterPluginId, input.key, "write value");
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

    return this.toSettingValue(record);
  }

  async getResolvedValueByKey(key: string): Promise<ResolvedSettingValue | null> {
    const value = await this.values.findByKey(key);
    if (value) {
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

    return {
      key: definition.key,
      ownerPluginId: definition.ownerPluginId,
      value: cloneJsonValue(definition.defaultValue),
      source: "default",
      updatedAt: definition.updatedAt
    };
  }

  async upsertSecret(input: {
    requesterPluginId: string;
    key: string;
    plaintext: string;
    updatedBy?: string;
  }): Promise<SettingSecretMetadata> {
    assertRequesterOwnsSettingKey(input.requesterPluginId, input.key, "write secret");

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

    return this.toSecretMetadata(record);
  }

  async getSecretMetadata(
    requesterPluginId: string,
    key: string
  ): Promise<SettingSecretMetadata | null> {
    const metadata = await this.getSecretMetadataByKey(key);
    if (!metadata) return null;

    const normalizedRequester = requesterPluginId.trim().toLowerCase();
    if (metadata.ownerPluginId !== normalizedRequester) {
      throw createSettingsOwnerAccessError({
        action: "read secret metadata",
        key,
        requesterPluginId: normalizedRequester,
        ownerPluginId: metadata.ownerPluginId
      });
    }

    return metadata;
  }

  async getSecretMetadataByKey(key: string): Promise<SettingSecretMetadata | null> {
    const record = await this.secrets.findByKey(key);
    if (!record) return null;

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
      throw createSettingsOwnerAccessError({
        action: "reveal secret",
        key,
        requesterPluginId: normalizedRequester,
        ownerPluginId: record.ownerPluginId
      });
    }

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

    return {
      pluginId: normalizedPluginId,
      definitions,
      values: values.map((item) => this.toSettingValue(item)),
      secrets: secrets.map((item) => this.toSecretMetadata(item))
    };
  }

  private toDefinition(record: {
    id: string;
    key: string;
    ownerPluginId: string;
    category?: string;
    description?: string;
    schema?: JsonValue;
    defaultValue?: JsonValue;
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
}
