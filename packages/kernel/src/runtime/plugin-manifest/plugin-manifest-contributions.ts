import { s } from "@trinacria/schema";
import { createSchema, type Schema } from "@trinacria/schema/dist/core/index.js";
import type { JsonValue } from "../../contracts/plugin-manifest.js";
import {
  isValidPluginId,
  isValidNamespaceSegment,
  isReservedNamespaceSegment,
  buildContributionKey,
  findContributionCollisions
} from "../plugin-namespace/plugin-namespace.js";
import {
  isValidPermissionKey,
  isPermissionOwnedByPlugin
} from "../plugin-namespace/permission-key.js";

const namespaceSegmentSchema = s
  .string({ trim: true, toLowerCase: true, minLength: 1, maxLength: 80 })
  .refine(
    (value) => /^[a-z0-9][a-z0-9._-]*$/.test(value),
    "Namespace segment is invalid or reserved",
    "invalid_namespace_segment"
  );

const publicPathSchema = s.string({ trim: true, minLength: 1, maxLength: 180, startsWith: "/" });

const looseObjectSchema: Schema<Record<string, unknown>> = jsonValueSchema<
  Record<string, unknown>
>().refine(
  (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value),
  "Value must be a JSON object",
  "invalid_json_object"
);

const entityIndexDirectionSchema = s.union([s.literal(1), s.literal(-1), s.literal("text")]);

const entityIndexSchema = s.object(
  {
    name: namespaceSegmentSchema,
    fields: s
      .record(s.string({ trim: true, minLength: 1, maxLength: 120 }), entityIndexDirectionSchema)
      .refine(
        (value) => Object.keys(value).length > 0,
        "Index fields cannot be empty",
        "empty_index"
      ),
    unique: s.boolean().optional().default(false),
    sparse: s.boolean().optional().default(false),
    partialFilter: looseObjectSchema.optional()
  },
  { strict: true }
);

const entityRepositorySchema = s.object(
  {
    mode: s.enum(["standard", "custom"] as const),
    token: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional()
  },
  { strict: true }
);

export const entitySchema = s.object(
  {
    name: namespaceSegmentSchema,
    collection: s
      .string({ trim: true, toLowerCase: true, minLength: 1, maxLength: 120 })
      .refine(
        (value) => /^[a-z0-9][a-z0-9._-]*$/.test(value) && !isReservedNamespaceSegment(value),
        "Entity collection is invalid or reserved",
        "invalid_entity_collection"
      )
      .optional(),
    displayName: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    schemaVersion: s.number({ int: true, min: 1 }),
    documentSchema: looseObjectSchema.optional(),
    indexes: s
      .array(entityIndexSchema, {
        unique: (index) => index.name
      })
      .optional()
      .default([]),
    repository: entityRepositorySchema.optional()
  },
  { strict: true }
);

/**
 * Schema that accepts any JSON-compatible value.
 */
function jsonValueSchema<T = unknown>(): Schema<T> {
  return createSchema<T>(
    "json",
    (input) => {
      if (
        input === null ||
        typeof input === "string" ||
        typeof input === "number" ||
        typeof input === "boolean"
      ) {
        return input as T;
      }
      if (Array.isArray(input)) {
        return input as T;
      }
      if (typeof input === "object") {
        return input as T;
      }
      throw new Error("Value must be JSON-compatible");
    },
    () => ({
      oneOf: [
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        { type: "null" },
        { type: "array", items: {} },
        { type: "object", additionalProperties: true }
      ]
    })
  );
}

const settingKeySchema = s
  .string({ trim: true, toLowerCase: true, minLength: 5, maxLength: 220 })
  .refine(
    (value) => /^[a-z0-9][a-z0-9._/-]*:[a-z0-9][a-z0-9._-]*:[a-z0-9][a-z0-9._-]*$/.test(value),
    "setting key must be '<pluginId>:<domain>:<name>'",
    "invalid_setting_key"
  );

const settingV2VisibilitySchema = s.enum(["public", "admin", "internal"] as const);

export const settingSchema = s.object(
  {
    key: settingKeySchema,
    category: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    description: s.string({ trim: true, maxLength: 500 }).optional(),
    schema: jsonValueSchema<JsonValue>().optional(),
    defaultValue: jsonValueSchema<JsonValue>().optional(),
    status: s
      .enum(["active", "disabled"] as const)
      .optional()
      .default("active"),
    secret: s.boolean().optional().default(false),
    mutable: s.boolean().optional().default(true),
    visibility: settingV2VisibilitySchema.optional().default("public")
  },
  { strict: true }
);

const emittedEventSchema = s.object(
  {
    name: namespaceSegmentSchema,
    visibility: s.enum(["public", "protected", "private", "audit"] as const),
    version: s.number({ int: true, min: 1 }),
    delivery: s
      .enum(["sync", "async", "deferred"] as const)
      .optional()
      .default("async"),
    payloadSchema: looseObjectSchema.optional()
  },
  { strict: true }
);

const eventSubscriptionSchema = s.object(
  {
    eventName: s.string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 180 }).refine(
      (value) => {
        const [pluginId, eventName, ...rest] = value.split(":");
        return (
          rest.length === 0 &&
          Boolean(pluginId) &&
          Boolean(eventName) &&
          (pluginId === "*" || isValidPluginId(pluginId)) &&
          isValidNamespaceSegment(eventName)
        );
      },
      "Subscribed eventName must be '<pluginId>:<eventName>' or '*:<eventName>'",
      "invalid_subscribed_event_name"
    ),
    handler: s.string({ trim: true, minLength: 1, maxLength: 180 }),
    requiredPermission: s
      .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
      .refine(
        (value) => isValidPermissionKey(value),
        "requiredPermission must be '<pluginId>:<resource>:<action>'",
        "invalid_required_permission"
      )
      .optional()
  },
  { strict: true }
);

export const eventsSchema = s.object(
  {
    emits: s
      .array(emittedEventSchema, {
        unique: (event) => event.name
      })
      .optional()
      .default([]),
    subscribes: s
      .array(eventSubscriptionSchema, {
        unique: (subscription) => `${subscription.eventName}|${subscription.handler}`
      })
      .optional()
      .default([])
  },
  { strict: true }
);

const localeSchema = s
  .string({ trim: true, minLength: 2, maxLength: 35 })
  .refine(
    (value) => /^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(value),
    "locale must be a BCP-47 language tag such as 'en', 'it', or 'fr-CA'",
    "invalid_locale"
  );

// Translation surfaces intentionally allow names such as `admin` and `public`.
// These do not allocate a runtime/entity namespace, so reserved entity names do
// not apply here.
const translationNamespaceSchema = s
  .string({ trim: true, toLowerCase: true, minLength: 1, maxLength: 80 })
  .refine(
    (value) => /^[a-z0-9][a-z0-9._-]*$/.test(value),
    "Translation namespace is invalid",
    "invalid_translation_namespace"
  );

const translationNamespaceDeclarationSchema = s.object(
  {
    id: translationNamespaceSchema,
    surface: translationNamespaceSchema,
    locales: s.array(localeSchema, { unique: true }).refine(
      (locales) => locales.length > 0,
      "At least one translation locale is required"
    ),
    source: translationNamespaceSchema
  },
  { strict: true }
);

/** Strict, transport-safe translation declaration for installable plugins. */
export const i18nSchema = s
  .object(
    {
      fallbackLocale: s.literal("en"),
      namespaces: s.array(translationNamespaceDeclarationSchema, {
        unique: (namespace) => namespace.id
      })
    },
    { strict: true }
  )
  .refine(
    (value) =>
      value.namespaces.every((namespace) => namespace.locales.includes(value.fallbackLocale)),
    "Every i18n namespace must include the declared English fallback",
    "missing_i18n_fallback"
  );

const adminNavigationSchema = s.object(
  {
    id: namespaceSegmentSchema,
    label: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    path: publicPathSchema.optional(),
    requiredPermission: s
      .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
      .refine(
        (value) => isValidPermissionKey(value),
        "requiredPermission must be '<pluginId>:<resource>:<action>'",
        "invalid_required_permission"
      )
      .optional(),
    order: s.number({ int: true }).optional()
  },
  { strict: true }
);

const adminRouteSchema = s.object(
  {
    id: namespaceSegmentSchema,
    path: publicPathSchema,
    label: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    requiredPermission: s
      .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
      .refine(
        (value) => isValidPermissionKey(value),
        "requiredPermission must be '<pluginId>:<resource>:<action>'",
        "invalid_required_permission"
      )
      .optional(),
    componentRef: s.string({ trim: true, minLength: 1, maxLength: 180 }).optional(),
    order: s.number({ int: true }).optional()
  },
  { strict: true }
);

const adminResourceSchema = s.object(
  {
    id: namespaceSegmentSchema,
    label: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    routeBase: publicPathSchema,
    apiBase: publicPathSchema,
    requiredPermission: s
      .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
      .refine(
        (value) => isValidPermissionKey(value),
        "requiredPermission must be '<pluginId>:<resource>:<action>'",
        "invalid_required_permission"
      )
      .optional()
  },
  { strict: true }
);

const dashboardColumnSpanSchema = s.union([s.literal(1), s.literal(2), s.literal(3), s.literal(4)]);
const dashboardRowSpanSchema = s.union([s.literal(1), s.literal(2), s.literal(3)]);

const adminWidgetLayoutSchema = s
  .object(
    {
      defaultColumnSpan: dashboardColumnSpanSchema.optional(),
      defaultRowSpan: dashboardRowSpanSchema.optional(),
      columnSpan: dashboardColumnSpanSchema.optional(),
      rowSpan: dashboardRowSpanSchema.optional(),
      minColumnSpan: dashboardColumnSpanSchema.optional(),
      maxColumnSpan: dashboardColumnSpanSchema.optional(),
      minRowSpan: dashboardRowSpanSchema.optional(),
      maxRowSpan: dashboardRowSpanSchema.optional()
    },
    { strict: true }
  )
  .refine(
    (layout) =>
      (layout.minColumnSpan ?? 1) <= (layout.maxColumnSpan ?? 4) &&
      (layout.minRowSpan ?? 1) <= (layout.maxRowSpan ?? 3),
    "Widget layout minimum span cannot exceed its maximum span",
    "invalid_widget_layout_bounds"
  );

const adminWidgetSchema = s.object(
  {
    id: namespaceSegmentSchema,
    label: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    requiredPermission: s
      .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
      .refine(
        (value) => isValidPermissionKey(value),
        "requiredPermission must be '<pluginId>:<resource>:<action>'",
        "invalid_required_permission"
      )
      .optional(),
    componentRef: s.string({ trim: true, minLength: 1, maxLength: 180 }).optional(),
    layout: adminWidgetLayoutSchema.optional()
  },
  { strict: true }
);

const adminSettingsSectionSchema = s.object(
  {
    id: namespaceSegmentSchema,
    label: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    namespace: namespaceSegmentSchema.optional(),
    requiredPermission: s
      .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
      .refine(
        (value) => isValidPermissionKey(value),
        "requiredPermission must be '<pluginId>:<resource>:<action>'",
        "invalid_required_permission"
      )
      .optional(),
    kind: s.enum(["form", "panel", "custom"] as const).optional(),
    componentRef: s.string({ trim: true, minLength: 1, maxLength: 180 }).optional(),
    summary: s.string({ trim: true, minLength: 1, maxLength: 500 }).optional(),
    category: namespaceSegmentSchema.optional(),
    settingKeys: s
      .array(s.string({ trim: true, minLength: 1, maxLength: 220 }), {
        unique: (key) => key
      })
      .optional(),
    data: jsonValueSchema().optional(),
    actions: s.array(jsonValueSchema()).optional(),
    order: s.number().optional()
  },
  { strict: true }
);

export const adminSchema = s.object(
  {
    navigation: s
      .array(adminNavigationSchema, {
        unique: (item) => item.id
      })
      .optional()
      .default([]),
    routes: s
      .array(adminRouteSchema, {
        unique: (route) => route.id
      })
      .optional()
      .default([]),
    resources: s
      .array(adminResourceSchema, {
        unique: (resource) => resource.id
      })
      .optional()
      .default([]),
    widgets: s
      .array(adminWidgetSchema, {
        unique: (widget) => widget.id
      })
      .optional()
      .default([]),
    settingsSections: s
      .array(adminSettingsSectionSchema, {
        unique: (section) => section.id
      })
      .optional()
      .default([])
  },
  { strict: true }
);

export function createContributionRefines(_manifestId: string) {
  return {
    entityCollision: (manifest: { id: string; entities?: readonly { name: string }[] }) => {
      const keys = (manifest.entities ?? []).map((entity) =>
        buildContributionKey(manifest.id, entity.name)
      );
      return findContributionCollisions("entity", keys).length === 0;
    },
    settingCollision: (manifest: { id: string; settings?: readonly { key: string }[] }) => {
      const keys = (manifest.settings ?? []).map((setting) => setting.key);
      return findContributionCollisions("setting", keys).length === 0;
    },
    eventCollision: (manifest: {
      id: string;
      events?: { emits?: readonly { name: string }[] };
    }) => {
      const keys = (manifest.events?.emits ?? []).map((event) =>
        buildContributionKey(manifest.id, event.name)
      );
      return findContributionCollisions("event", keys).length === 0;
    },
    requiredPermissionOwnership: (manifest: {
      id: string;
      events?: { subscribes?: readonly { requiredPermission?: string }[] };
      admin?: {
        navigation?: readonly { requiredPermission?: string }[];
        routes?: readonly { requiredPermission?: string }[];
        resources?: readonly { requiredPermission?: string }[];
        widgets?: readonly { requiredPermission?: string }[];
        settingsSections?: readonly { requiredPermission?: string }[];
      };
    }) => {
      const permissionRefs = [
        ...(manifest.admin?.navigation ?? []).map((item) => item.requiredPermission),
        ...(manifest.admin?.routes ?? []).map((route) => route.requiredPermission),
        ...(manifest.admin?.resources ?? []).map((resource) => resource.requiredPermission),
        ...(manifest.admin?.widgets ?? []).map((widget) => widget.requiredPermission),
        ...(manifest.admin?.settingsSections ?? []).map((section) => section.requiredPermission)
      ].filter((p): p is string => Boolean(p));

      return permissionRefs.every((permission) =>
        isPermissionOwnedByPlugin(manifest.id, permission)
      );
    }
  };
}
