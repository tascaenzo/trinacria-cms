import type { JsonValue, PluginManifestSetting } from "../contracts/plugin-manifest.js";
import { defineQualifiedKey, normalizeKeySegment } from "./naming.js";

export type DefineSettingInput = Omit<PluginManifestSetting, "key" | "category"> & {
  pluginId: string;
  domain: string;
  name: string;
  category?: string;
};

export function defineSettingKey(pluginId: string, domain: string, name: string): string {
  return defineQualifiedKey({ pluginId, segments: [domain, name] });
}

export function defineSetting(input: DefineSettingInput): PluginManifestSetting {
  return {
    key: defineSettingKey(input.pluginId, input.domain, input.name),
    category: input.category ?? normalizeKeySegment(input.domain),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.schema !== undefined ? { schema: input.schema } : {}),
    ...(input.defaultValue !== undefined ? { defaultValue: input.defaultValue } : {}),
    status: input.status ?? "active",
    secret: input.secret ?? false,
    mutable: input.mutable ?? true,
    visibility: input.visibility ?? "admin"
  };
}

export function defineStringSetting(
  input: Omit<DefineSettingInput, "schema" | "defaultValue"> & {
    defaultValue?: string;
    minLength?: number;
    maxLength?: number;
  }
): PluginManifestSetting {
  return defineSetting({
    ...input,
    schema: compactSchema({
      type: "string",
      minLength: input.minLength,
      maxLength: input.maxLength
    }),
    ...(input.defaultValue !== undefined ? { defaultValue: input.defaultValue } : {})
  });
}

export function defineBooleanSetting(
  input: Omit<DefineSettingInput, "schema" | "defaultValue"> & { defaultValue?: boolean }
): PluginManifestSetting {
  return defineSetting({
    ...input,
    schema: { type: "boolean" },
    ...(input.defaultValue !== undefined ? { defaultValue: input.defaultValue } : {})
  });
}

export function defineNumberSetting(
  input: Omit<DefineSettingInput, "schema" | "defaultValue"> & {
    defaultValue?: number;
    minimum?: number;
    maximum?: number;
  }
): PluginManifestSetting {
  return defineSetting({
    ...input,
    schema: compactSchema({
      type: "number",
      minimum: input.minimum,
      maximum: input.maximum
    }),
    ...(input.defaultValue !== undefined ? { defaultValue: input.defaultValue } : {})
  });
}

function compactSchema(schema: Record<string, JsonValue | undefined>): JsonValue {
  return Object.fromEntries(
    Object.entries(schema).filter((entry): entry is [string, JsonValue] => entry[1] !== undefined)
  );
}
