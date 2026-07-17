import { defineEntity, s, type Infer } from "@trinacria-cms/kernel";

export const EntryStatusSchema = s.enum([
  "draft",
  "in_review",
  "approved",
  "published",
  "archived"
] as const);
const JsonScalarSchema = s.union([s.string(), s.number(), s.boolean()]);
const JsonObjectSchema = s.record(s.string({ trim: true, minLength: 1 }), JsonScalarSchema);
const JsonValueSchema = s.union([
  JsonScalarSchema,
  JsonObjectSchema,
  s.array(JsonScalarSchema),
  s.array(JsonObjectSchema)
]);
const FreeformObjectSchema = s.record(s.string({ trim: true, minLength: 1 }), JsonValueSchema);

export const EntryRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    contentTypeId: s.string({ trim: true, minLength: 1 }),
    ownerUserId: s.string({ trim: true, minLength: 1 }),
    title: s.string({ trim: true, minLength: 1, maxLength: 240 }).optional(),
    slug: s
      .string({
        trim: true,
        toLowerCase: true,
        minLength: 1,
        maxLength: 240,
        pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
      })
      .optional(),
    body: FreeformObjectSchema.optional(),
    data: FreeformObjectSchema,
    status: EntryStatusSchema,
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type EntryRecord = Infer<typeof EntryRecordSchema>;

export const ENTRIES_ENTITY = defineEntity({
  entityName: "entries",
  schema: EntryRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "entries_id_unique" },
    {
      fields: { contentTypeId: 1, status: 1, updatedAt: -1 },
      name: "entries_content_type_status_updated_idx"
    },
    {
      fields: { ownerUserId: 1, status: 1, updatedAt: -1 },
      name: "entries_owner_status_updated_idx"
    },
    { fields: { contentTypeId: 1, slug: 1 }, sparse: true, name: "entries_content_type_slug_idx" }
  ] as const
});
