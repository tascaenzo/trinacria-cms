import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import type { JsonValue } from "./settings-json.js";
import type { SettingsDefinition, SettingsService } from "./settings.service.js";

export interface CorePackSettingDefinitionSeed {
  key: string;
  category: string;
  description: string;
  defaultValue: JsonValue;
  schema: JsonValue;
}

export const CORE_PACK_SETTING_DEFINITION_SEEDS: readonly CorePackSettingDefinitionSeed[] =
  Object.freeze([
    {
      key: "core-pack:site:name",
      category: "site",
      description: "Human-readable CMS site name shown in admin shells and page chrome.",
      defaultValue: "Trinacria CMS",
      schema: {
        type: "string",
        minLength: 1,
        maxLength: 120
      } as JsonValue
    },
    {
      key: "core-pack:site:url",
      category: "site",
      description: "Canonical public origin used for links, previews, and integrations.",
      defaultValue: "http://localhost:3000",
      schema: {
        type: "string",
        format: "uri"
      } as JsonValue
    },
    {
      key: "core-pack:cms:locale",
      category: "internationalization",
      description: "Default locale used by the CMS when no content-specific locale is selected.",
      defaultValue: "it-IT",
      schema: {
        type: "string",
        pattern: "^[a-z]{2}(-[A-Z]{2})?$"
      } as JsonValue
    },
    {
      key: "core-pack:cms:timezone",
      category: "internationalization",
      description:
        "Default IANA timezone used for scheduling, editorial dates, and audit displays.",
      defaultValue: "Europe/Rome",
      schema: {
        type: "string",
        minLength: 3,
        maxLength: 120
      } as JsonValue
    },
    {
      key: "core-pack:branding:tagline",
      category: "branding",
      description:
        "Short brand descriptor surfaced in dashboards and installation handoff screens.",
      defaultValue: "Plugin-based editorial platform",
      schema: {
        type: "string",
        maxLength: 160
      } as JsonValue
    },
    {
      key: "core-pack:branding:logo_url",
      category: "branding",
      description: "Public logo URL used by the backoffice and integrations when present.",
      defaultValue: "/assets/trinacria-logo.svg",
      schema: {
        type: "string",
        format: "uri-reference"
      } as JsonValue
    },
    {
      key: "core-pack:features:editorial_workflow",
      category: "features",
      description: "Feature flag reserved for the editorial workflow milestone rollout.",
      defaultValue: false,
      schema: {
        type: "boolean"
      } as JsonValue
    }
  ]);

export async function provisionCorePackSettingDefinitions(
  settings: SettingsService
): Promise<readonly SettingsDefinition[]> {
  const definitions: SettingsDefinition[] = [];

  for (const definition of CORE_PACK_SETTING_DEFINITION_SEEDS) {
    definitions.push(
      await settings.upsertDefinition({
        requesterPluginId: CORE_PACK_PLUGIN_ID,
        key: definition.key,
        category: definition.category,
        description: definition.description,
        schema: definition.schema,
        defaultValue: definition.defaultValue,
        status: "active"
      })
    );
  }

  return definitions;
}
