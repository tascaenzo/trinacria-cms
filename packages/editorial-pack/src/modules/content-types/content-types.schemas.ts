import { defineEntity, s, type Infer } from "@trinacria-cms/kernel";

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

const FreeformObjectSchema = s.object({}, { strict: false });

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
    config: FreeformObjectSchema.optional()
  },
  { strict: true }
);

export type ContentTypeField = Infer<typeof ContentTypeFieldSchema>;

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
    ownershipScope: ContentTypeOwnershipScopeSchema,
    createdByUserId: s.string({ trim: true, minLength: 1 }),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type ContentTypeRecord = Infer<typeof ContentTypeRecordSchema>;

export const CONTENT_TYPES_ENTITY = defineEntity({
  entityName: "content_types",
  schema: ContentTypeRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "content_types_id_unique" },
    { fields: { key: 1 }, unique: true, name: "content_types_key_unique" },
    { fields: { status: 1, updatedAt: -1 }, name: "content_types_status_updated_idx" }
  ] as const
});
