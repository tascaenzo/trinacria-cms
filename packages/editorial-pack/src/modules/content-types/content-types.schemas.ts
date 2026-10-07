import { type Infer, s } from "@trinacria-cms/kernel";
import { defineEntity } from "@trinacria-cms/kernel/runtime";

export const ContentTypeStatusSchema = s.enum(["active", "archived"] as const);
export const ContentTypeFieldKindSchema = s.enum([
  "text",
  "rich_text",
  "number",
  "boolean",
  "date_time",
  "select",
  "url",
  "media",
  "relation",
  "json",
  "repeatable"
] as const);
export const ContentTypeOwnershipScopeSchema = s.enum([
  "inherit",
  "own_entries",
  "all_entries"
] as const);

const ContentTypeFieldConfigSchema = s.object(
  {
    options: s
      .array(s.string({ trim: true, minLength: 1, maxLength: 120 }), { unique: true })
      .optional(),
    targetContentTypeId: s.string({ trim: true, minLength: 1 }).optional(),
    allowedMimeTypes: s
      .array(s.string({ trim: true, minLength: 1, maxLength: 120 }), { unique: true })
      .optional()
  },
  { strict: false }
);
const WorkflowStateKeySchema = s.string({
  trim: true,
  toLowerCase: true,
  minLength: 1,
  maxLength: 80,
  pattern: /^[a-z][a-z0-9_]*$/
});

export const ContentWorkflowStateSchema = s.object(
  {
    key: WorkflowStateKeySchema,
    label: s.string({ trim: true, minLength: 1, maxLength: 80 }),
    initial: s.boolean()
  },
  { strict: true }
);

export const ContentWorkflowTransitionSchema = s.object(
  {
    key: WorkflowStateKeySchema,
    label: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    from: WorkflowStateKeySchema,
    to: WorkflowStateKeySchema,
    requiredPermission: s.enum(["submit", "review", "approve", "publish"] as const).optional()
  },
  { strict: true }
);

export const ContentWorkflowSchema = s.object(
  {
    preset: s.enum(["review", "direct", "custom"] as const),
    name: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    states: s.array(ContentWorkflowStateSchema, { unique: false }),
    transitions: s.array(ContentWorkflowTransitionSchema, { unique: false })
  },
  { strict: true }
);

export type ContentWorkflow = Infer<typeof ContentWorkflowSchema>;

export const ContentTypeFieldSchema = s.object(
  {
    key: s.string({
      trim: true,
      toLowerCase: true,
      minLength: 1,
      maxLength: 80,
      pattern: /^[a-z][a-z0-9_]*$/
    }),
    label: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    type: ContentTypeFieldKindSchema,
    required: s.boolean(),
    multiple: s.boolean(),
    helpText: s.string({ trim: true, maxLength: 500 }).optional(),
    config: ContentTypeFieldConfigSchema.optional()
  },
  { strict: true }
);

export type ContentTypeField = Infer<typeof ContentTypeFieldSchema>;

export const DeliveryConfigSchema = s.object(
  {
    enabled: s.boolean(),
    publicFields: s.array(s.string({ pattern: /^[a-z][a-z0-9_]*$/, maxLength: 80 }), {
      unique: true,
      maxItems: 100
    }),
    exposeTitle: s.boolean(),
    exposeBody: s.boolean(),
    exposeSlug: s.boolean()
  },
  { strict: true }
);
export type DeliveryConfig = Infer<typeof DeliveryConfigSchema>;
export const disabledDelivery = (): DeliveryConfig => ({
  enabled: false,
  publicFields: [],
  exposeTitle: false,
  exposeBody: false,
  exposeSlug: false
});

export const ContentTypeRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    key: s.string({
      trim: true,
      toLowerCase: true,
      minLength: 2,
      maxLength: 80,
      pattern: /^[a-z][a-z0-9-]*$/
    }),
    name: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    description: s.string({ trim: true, maxLength: 500 }).optional(),
    icon: s.string({ trim: true, minLength: 1, maxLength: 80 }).optional(),
    status: ContentTypeStatusSchema,
    fields: s.array(ContentTypeFieldSchema, { unique: false }),
    taxonomyIds: s.array(s.string({ trim: true, minLength: 1 }), { unique: true }),
    workflowId: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    workflow: ContentWorkflowSchema.optional(),
    // Kept only to read existing records created before model navigation became mandatory.
    showInMainNavigation: s.boolean().optional(),
    ownershipScope: ContentTypeOwnershipScopeSchema,
    version: s.number({ int: true, min: 1 }),
    delivery: DeliveryConfigSchema.optional(),
    deliveryConfigVersion: s.number({ int: true, min: 1 }).optional(),
    createdByUserId: s.string({ trim: true, minLength: 1 }),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString(),
    deletedAt: s.dateTimeString().optional()
  },
  { strict: true }
);

export type ContentTypeRecord = Infer<typeof ContentTypeRecordSchema>;

export const CONTENT_TYPES_ENTITY = defineEntity({
  ownerPluginId: "editorial-pack",
  entityName: "content_types",
  schema: ContentTypeRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "content_types_id_unique" },
    { fields: { key: 1 }, unique: true, name: "content_types_key_unique" },
    { fields: { status: 1, updatedAt: -1 }, name: "content_types_status_updated_idx" }
  ] as const
});
