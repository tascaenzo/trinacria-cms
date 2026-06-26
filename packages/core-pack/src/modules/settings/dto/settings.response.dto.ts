import { s } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import { JsonValueOpenApiSchema } from "./settings.input.dto.js";

/**
 * Shared API metadata schema for settings endpoints.
 */
export const SettingsResponseMetaSchema = s.object(
  {
    pluginId: s.literal(CORE_PACK_PLUGIN_ID).optional(),
    count: s.number({ int: true }).optional(),
    limit: s.number({ int: true }).optional(),
    offset: s.number({ int: true }).optional()
  },
  { strict: true }
);

/**
 * Standardized API error payload schema.
 */
export const SettingsApiErrorSchema = s.object(
  {
    code: s.string({ trim: true, minLength: 1 }),
    message: s.string({ trim: true, minLength: 1 })
  },
  { strict: true }
);

/**
 * OpenAPI response schema for error responses.
 */
export const SettingsErrorResponseSchema = s.object(
  {
    error: SettingsApiErrorSchema,
    meta: SettingsResponseMetaSchema.optional()
  },
  { strict: true }
);

export const SettingDefinitionOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["id", "key", "ownerPluginId", "status", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" },
    key: { type: "string" },
    ownerPluginId: { type: "string" },
    category: { type: "string" },
    description: { type: "string" },
    schema: JsonValueOpenApiSchema,
    defaultValue: JsonValueOpenApiSchema,
    visibility: { type: "string", enum: ["public", "admin", "internal"] },
    mutable: { type: "boolean" },
    secret: { type: "boolean" },
    status: { type: "string", enum: ["active", "disabled"] },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" }
  }
};

export const SettingValueOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["id", "key", "ownerPluginId", "value", "version", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" },
    key: { type: "string" },
    ownerPluginId: { type: "string" },
    value: JsonValueOpenApiSchema,
    version: { type: "integer" },
    updatedBy: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" }
  }
};

export const SettingSecretMetadataOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "key",
    "ownerPluginId",
    "algorithm",
    "keyVersion",
    "maskedValue",
    "createdAt",
    "updatedAt"
  ],
  properties: {
    id: { type: "string" },
    key: { type: "string" },
    ownerPluginId: { type: "string" },
    algorithm: { type: "string", enum: ["aes-256-gcm"] },
    keyVersion: { type: "string" },
    maskedValue: { type: "string" },
    updatedBy: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" }
  }
};

export const ResolvedSettingValueOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["key", "ownerPluginId", "value", "source", "updatedAt"],
  properties: {
    key: { type: "string" },
    ownerPluginId: { type: "string" },
    value: JsonValueOpenApiSchema,
    source: { type: "string", enum: ["value", "default"] },
    version: { type: "integer" },
    updatedAt: { type: "string", format: "date-time" }
  }
};

export const SettingsGroupSummaryOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["id", "label", "ownerPluginIds", "definitionCount", "editableCount", "secretCount"],
  properties: {
    id: { type: "string" },
    label: { type: "string" },
    ownerPluginIds: {
      type: "array",
      items: { type: "string" }
    },
    definitionCount: { type: "integer" },
    editableCount: { type: "integer" },
    secretCount: { type: "integer" }
  }
};

export const SettingsGroupFieldOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["fieldId", "key", "ownerPluginId", "domain", "name", "definition"],
  properties: {
    fieldId: { type: "string" },
    key: { type: "string" },
    ownerPluginId: { type: "string" },
    domain: { type: "string" },
    name: { type: "string" },
    definition: SettingDefinitionOpenApiSchema,
    value: JsonValueOpenApiSchema,
    source: { type: "string", enum: ["value", "default"] },
    version: { type: "integer" },
    updatedAt: { type: "string", format: "date-time" },
    secretMetadata: SettingSecretMetadataOpenApiSchema
  }
};

export const SettingsGroupSnapshotOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["id", "label", "ownerPluginIds", "values", "fields"],
  properties: {
    id: { type: "string" },
    label: { type: "string" },
    ownerPluginIds: {
      type: "array",
      items: { type: "string" }
    },
    values: {
      type: "object",
      additionalProperties: JsonValueOpenApiSchema
    },
    fields: {
      type: "array",
      items: SettingsGroupFieldOpenApiSchema
    }
  }
};

export const SettingsGroupUpdateResultOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["group", "updated"],
  properties: {
    group: SettingsGroupSnapshotOpenApiSchema,
    updated: {
      type: "array",
      items: SettingValueOpenApiSchema
    }
  }
};

export const RevealedSettingSecretOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["key", "value"],
  properties: {
    key: { type: "string" },
    value: { type: "string" }
  }
};

export const ExportedPluginSettingsOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["pluginId", "definitions", "values", "secrets"],
  properties: {
    pluginId: { type: "string" },
    definitions: {
      type: "array",
      items: SettingDefinitionOpenApiSchema
    },
    values: {
      type: "array",
      items: SettingValueOpenApiSchema
    },
    secrets: {
      type: "array",
      items: SettingSecretMetadataOpenApiSchema
    }
  }
};

export const ListSettingDefinitionsResponseOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["data"],
  properties: {
    data: {
      type: "array",
      items: SettingDefinitionOpenApiSchema
    },
    meta: toOpenApiLooseMeta()
  }
};

export const ListSettingsGroupsResponseOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["data"],
  properties: {
    data: {
      type: "array",
      items: SettingsGroupSummaryOpenApiSchema
    },
    meta: toOpenApiLooseMeta()
  }
};

export const SettingDefinitionResponseOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["data"],
  properties: {
    data: SettingDefinitionOpenApiSchema,
    meta: toOpenApiLooseMeta()
  }
};

export const SettingsGroupSnapshotResponseOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["data"],
  properties: {
    data: SettingsGroupSnapshotOpenApiSchema,
    meta: toOpenApiLooseMeta()
  }
};

export const SettingsGroupUpdateResultResponseOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["data"],
  properties: {
    data: SettingsGroupUpdateResultOpenApiSchema,
    meta: toOpenApiLooseMeta()
  }
};

export const SettingValueResponseOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["data"],
  properties: {
    data: SettingValueOpenApiSchema,
    meta: toOpenApiLooseMeta()
  }
};

export const ResolvedSettingValueResponseOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["data"],
  properties: {
    data: ResolvedSettingValueOpenApiSchema,
    meta: toOpenApiLooseMeta()
  }
};

export const SettingSecretMetadataResponseOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["data"],
  properties: {
    data: SettingSecretMetadataOpenApiSchema,
    meta: toOpenApiLooseMeta()
  }
};

export const RevealedSettingSecretResponseOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["data"],
  properties: {
    data: RevealedSettingSecretOpenApiSchema,
    meta: toOpenApiLooseMeta()
  }
};

export const ExportedPluginSettingsResponseOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["data"],
  properties: {
    data: ExportedPluginSettingsOpenApiSchema,
    meta: toOpenApiLooseMeta()
  }
};

function toOpenApiLooseMeta(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: true
  };
}
