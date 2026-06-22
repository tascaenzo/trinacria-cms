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
    (value) => isValidNamespaceSegment(value),
    "Namespace segment is invalid or reserved",
    "invalid_namespace_segment"
  );

const publicPathSchema = s.string({ trim: true, minLength: 1, maxLength: 180, startsWith: "/" });

const looseObjectSchema = s.object({}, { strict: false });

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
          isValidPluginId(pluginId) &&
          isValidNamespaceSegment(eventName)
        );
      },
      "Subscribed eventName must be '<pluginId>:<eventName>'",
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
    componentRef: s.string({ trim: true, minLength: 1, maxLength: 180 }).optional()
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

export function createContributionRefines(manifestId: string) {
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
        ...(manifest.events?.subscribes ?? []).map((s) => s.requiredPermission),
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
