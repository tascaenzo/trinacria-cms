import type { JsonValue, PluginManifestSetting } from "@trinacria-cms/kernel";
import { EDITORIAL_PACK_PLUGIN_ID } from "../../plugin/editorial-pack.constants.js";

export const EDITORIAL_PACK_SETTING_DEFINITIONS: readonly PluginManifestSetting[] = Object.freeze([
  {
    key: `${EDITORIAL_PACK_PLUGIN_ID}:workflow:default_preset`,
    category: "workflow",
    description: "Default editorial workflow applied to newly created content types.",
    defaultValue: "review",
    schema: { type: "string", enum: ["review", "direct"] } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${EDITORIAL_PACK_PLUGIN_ID}:workflow:definitions`,
    category: "workflow",
    description: "Reusable editorial workflow definitions and their authorized transitions.",
    defaultValue: [],
    schema: { type: "array" } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${EDITORIAL_PACK_PLUGIN_ID}:workflow:require_reviewer_assignment`,
    category: "workflow",
    description: "Require an assigned reviewer before an entry can be sent for review.",
    defaultValue: true,
    schema: { type: "boolean" } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${EDITORIAL_PACK_PLUGIN_ID}:access:author_scope`,
    category: "access",
    description: "Default ownership scope enforced for authors when accessing entries.",
    defaultValue: "own_entries",
    schema: {
      type: "string",
      enum: ["own_entries", "all_entries", "by_content_type"]
    } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${EDITORIAL_PACK_PLUGIN_ID}:revisions:retention`,
    category: "revisions",
    description: "Retention policy for immutable editorial revisions.",
    defaultValue: { mode: "keep_all" },
    schema: { type: "object" } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${EDITORIAL_PACK_PLUGIN_ID}:publication:validation_rules`,
    category: "publication",
    description: "Global checklist rules evaluated before publication.",
    defaultValue: [],
    schema: { type: "array" } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${EDITORIAL_PACK_PLUGIN_ID}:notifications:in_app_enabled`,
    category: "notifications",
    description: "Enable in-app notifications for editorial assignments and transitions.",
    defaultValue: true,
    schema: { type: "boolean" } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  }
]);
