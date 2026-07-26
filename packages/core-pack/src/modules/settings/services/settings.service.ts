import { createSettingsOwnerAccessError, SettingsAccessError } from "../_shared/settings.errors.js";
import { cloneJsonValue, type JsonValue, parseJsonValue } from "../_shared/settings-json.js";
import {
  assertRequesterOwnsSettingKey,
  getOwnerPluginIdFromSettingKey,
  parseSettingKey
} from "../_shared/settings-key.js";
import type {
  SettingsDefinitionsRepository,
  UpsertSettingDefinitionRecordInput
} from "../definitions/settings-definitions.repository.js";
import type {
  SettingsSecretsRepository,
  UpsertSettingSecretRecordInput
} from "../secrets/settings-secrets.repository.js";
import type { SettingsSecretsCryptoService } from "../secrets/settings-secrets-crypto.service.js";
import type {
  SettingsValuesRepository,
  UpsertSettingValueRecordInput
} from "../values/settings-values.repository.js";

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

export interface SettingsGroupSummary {
  id: string;
  label: string;
  ownerPluginIds: readonly string[];
  definitionCount: number;
  editableCount: number;
  secretCount: number;
}

export interface SettingsGroupField {
  fieldId: string;
  key: string;
  ownerPluginId: string;
  domain: string;
  name: string;
  definition: SettingsDefinition;
  value?: JsonValue;
  source?: "value" | "default";
  version?: number;
  updatedAt?: string;
  secretMetadata?: SettingSecretMetadata;
}

export interface SettingsGroupSnapshot {
  id: string;
  label: string;
  ownerPluginIds: readonly string[];
  values: Record<string, JsonValue>;
  fields: readonly SettingsGroupField[];
}

export interface SettingsGroupUpdateResult {
  group: SettingsGroupSnapshot;
  updated: readonly SettingValue[];
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
    private readonly crypto: SettingsSecretsCryptoService
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

      const record = await this.definitions.upsert({
        key: input.key,
        ownerPluginId: getOwnerPluginIdFromSettingKey(input.key),
        category: input.category,
        description: input.description,
        ...(input.schema !== undefined ? { schema: parseJsonValue(input.schema) } : {}),
        ...(input.defaultValue !== undefined
          ? { defaultValue: parseJsonValue(input.defaultValue) }
          : {}),
        visibility: input.visibility,
        mutable: input.mutable,
        secret: input.secret,
        status: input.status
      } satisfies UpsertSettingDefinitionRecordInput);

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

  /** Permanently removes a retired setting and every persisted representation of it. */
  async deleteRetiredSetting(input: { requesterPluginId: string; key: string }): Promise<void> {
    try {
      assertRequesterOwnsSettingKey(input.requesterPluginId, input.key, "delete retired setting");
      await this.secrets.deleteByKey(input.key);
      await this.values.deleteByKey(input.key);
      await this.definitions.deleteByKey(input.key);
      this.metrics.writes += 1;
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
        throw new Error(
          `Setting "${input.key}" is secret and cannot be written via value endpoint`
        );
      }
      if (!definition.mutable) {
        this.metrics.denies += 1;
        throw new Error(`Setting "${input.key}" is immutable`);
      }
      const parsedValue = parseJsonValue(input.value);

      const record = await this.values.upsert({
        key: input.key,
        ownerPluginId: getOwnerPluginIdFromSettingKey(input.key),
        value: parsedValue,
        updatedBy: input.updatedBy
      } satisfies UpsertSettingValueRecordInput);

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

  async listGroups(options?: { ownerPluginId?: string }): Promise<readonly SettingsGroupSummary[]> {
    try {
      const definitions = await this.listActiveDefinitions(options);
      this.metrics.reads += 1;
      return this.toGroupSummaries(definitions);
    } catch (error) {
      this.trackFailure(error);
      throw error;
    }
  }

  async listGroupsForPlugin(requesterPluginId: string): Promise<readonly SettingsGroupSummary[]> {
    return this.listGroups({ ownerPluginId: requesterPluginId.trim().toLowerCase() });
  }

  async getGroupById(
    groupId: string,
    options?: { ownerPluginId?: string }
  ): Promise<SettingsGroupSnapshot | null> {
    try {
      const normalizedGroupId = normalizeSettingsGroupId(groupId);
      const definitions = (await this.listActiveDefinitions(options)).filter(
        (definition) => getDefinitionGroupId(definition) === normalizedGroupId
      );
      if (definitions.length === 0) {
        return null;
      }

      this.metrics.reads += 1;
      return this.toGroupSnapshot(normalizedGroupId, definitions);
    } catch (error) {
      this.trackFailure(error);
      throw error;
    }
  }

  async getGroupForPlugin(
    requesterPluginId: string,
    groupId: string
  ): Promise<SettingsGroupSnapshot | null> {
    return this.getGroupById(groupId, { ownerPluginId: requesterPluginId.trim().toLowerCase() });
  }

  async upsertGroupValues(input: {
    requesterPluginId: string;
    groupId: string;
    values: Record<string, unknown>;
    updatedBy?: string;
    admin?: boolean;
  }): Promise<SettingsGroupUpdateResult> {
    try {
      const normalizedGroupId = normalizeSettingsGroupId(input.groupId);
      const ownerFilter = input.admin ? undefined : input.requesterPluginId.trim().toLowerCase();
      const definitions = (await this.listActiveDefinitions({ ownerPluginId: ownerFilter })).filter(
        (definition) => getDefinitionGroupId(definition) === normalizedGroupId
      );
      if (definitions.length === 0) {
        throw new Error(`Settings group "${normalizedGroupId}" not found`);
      }

      const writableFields = new Map<string, SettingsDefinition>();
      for (const definition of definitions) {
        writableFields.set(getDefinitionFieldId(definition), definition);
      }

      const updated: SettingValue[] = [];
      for (const [fieldId, rawValue] of Object.entries(input.values)) {
        const normalizedFieldId = normalizeSettingsFieldId(fieldId);
        const definition = writableFields.get(normalizedFieldId);
        if (!definition) {
          throw new Error(`Unknown setting field "${fieldId}" for group "${normalizedGroupId}"`);
        }
        if (definition.secret) {
          this.metrics.denies += 1;
          throw new Error(
            `Setting field "${normalizedFieldId}" is secret and cannot be written via group endpoint`
          );
        }
        if (!definition.mutable) {
          this.metrics.denies += 1;
          throw new Error(`Setting field "${normalizedFieldId}" is immutable`);
        }

        updated.push(
          await this.upsertValue({
            requesterPluginId: input.admin ? definition.ownerPluginId : input.requesterPluginId,
            key: definition.key,
            value: rawValue,
            updatedBy: input.updatedBy
          })
        );
      }

      const group = await this.getGroupById(normalizedGroupId, { ownerPluginId: ownerFilter });
      if (!group) {
        throw new Error(`Settings group "${normalizedGroupId}" disappeared during update`);
      }

      return { group, updated };
    } catch (error) {
      this.trackFailure(error);
      throw error;
    }
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

  private async listActiveDefinitions(options?: {
    ownerPluginId?: string;
  }): Promise<readonly SettingsDefinition[]> {
    const definitions = await this.listDefinitions({
      ownerPluginId: options?.ownerPluginId
    });
    return definitions.filter((definition) => definition.status === "active");
  }

  private toGroupSummaries(
    definitions: readonly SettingsDefinition[]
  ): readonly SettingsGroupSummary[] {
    const groups = new Map<string, SettingsDefinition[]>();
    for (const definition of definitions) {
      const groupId = getDefinitionGroupId(definition);
      groups.set(groupId, [...(groups.get(groupId) ?? []), definition]);
    }

    return [...groups.entries()]
      .map(([groupId, groupDefinitions]) => ({
        id: groupId,
        label: toSettingsGroupLabel(groupId),
        ownerPluginIds: uniqueSorted(
          groupDefinitions.map((definition) => definition.ownerPluginId)
        ),
        definitionCount: groupDefinitions.length,
        editableCount: groupDefinitions.filter(
          (definition) => definition.mutable && !definition.secret
        ).length,
        secretCount: groupDefinitions.filter((definition) => definition.secret).length
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  private async toGroupSnapshot(
    groupId: string,
    definitions: readonly SettingsDefinition[]
  ): Promise<SettingsGroupSnapshot> {
    const fields: SettingsGroupField[] = [];
    const values: Record<string, JsonValue> = {};

    for (const definition of [...definitions].sort((a, b) => a.key.localeCompare(b.key))) {
      const parsed = parseSettingKey(definition.key);
      if (!parsed) continue;
      const fieldId = getDefinitionFieldId(definition);
      const baseField = {
        fieldId,
        key: definition.key,
        ownerPluginId: definition.ownerPluginId,
        domain: parsed.domain,
        name: parsed.name,
        definition
      };

      if (definition.secret) {
        const secretMetadata = await this.getSecretMetadataByKey(definition.key);
        fields.push({
          ...baseField,
          ...(secretMetadata ? { secretMetadata } : {})
        });
        continue;
      }

      const resolved = await this.getResolvedValueByKey(definition.key);
      if (!resolved) {
        fields.push(baseField);
        continue;
      }

      values[fieldId] = cloneJsonValue(resolved.value);
      fields.push({
        ...baseField,
        value: cloneJsonValue(resolved.value),
        source: resolved.source,
        ...(resolved.version !== undefined ? { version: resolved.version } : {}),
        updatedAt: resolved.updatedAt
      });
    }

    return {
      id: groupId,
      label: toSettingsGroupLabel(groupId),
      ownerPluginIds: uniqueSorted(definitions.map((definition) => definition.ownerPluginId)),
      values,
      fields
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
      ...(record.schema !== undefined ? { schema: cloneJsonValue(record.schema) } : {}),
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

function getDefinitionGroupId(definition: SettingsDefinition): string {
  return normalizeSettingsGroupId(
    definition.category ?? parseSettingKey(definition.key)?.domain ?? "general"
  );
}

function getDefinitionFieldId(definition: SettingsDefinition): string {
  const parsed = parseSettingKey(definition.key);
  if (!parsed) {
    throw new Error(`Invalid setting key "${definition.key}"`);
  }
  return normalizeSettingsFieldId(`${parsed.domain}.${parsed.name}`);
}

function normalizeSettingsGroupId(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "-");
  if (!normalized) {
    throw new Error("Settings group id is required");
  }
  return normalized;
}

function normalizeSettingsFieldId(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized.includes(".")) {
    throw new Error(`Invalid settings group field "${value}". Expected '<domain>.<name>'`);
  }
  return normalized;
}

function toSettingsGroupLabel(groupId: string): string {
  return groupId
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}
