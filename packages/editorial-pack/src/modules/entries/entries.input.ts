import { s, type Infer } from "@trinacria-cms/kernel";

const JsonScalarSchema = s.union([s.string(), s.number(), s.boolean()]);
const JsonObjectSchema = s.record(s.string({ trim: true, minLength: 1 }), JsonScalarSchema);
const JsonValueSchema = s.union([
  JsonScalarSchema,
  JsonObjectSchema,
  s.array(JsonScalarSchema),
  s.array(JsonObjectSchema)
]);
const FreeformObjectSchema = s.record(s.string({ trim: true, minLength: 1 }), JsonValueSchema);

export const CreateEntryInputSchema = s.object(
  {
    contentTypeId: s.string({ trim: true, minLength: 1 }),
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
    data: FreeformObjectSchema
  },
  { strict: true }
);

export type CreateEntryInput = Infer<typeof CreateEntryInputSchema>;

export const UpdateEntryInputSchema = s.object(
  {
    title: s.string({ trim: true, minLength: 1, maxLength: 240 }).optional(),
    clearTitle: s.boolean().optional(),
    slug: s
      .string({
        trim: true,
        toLowerCase: true,
        minLength: 1,
        maxLength: 240,
        pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
      })
      .optional(),
    clearSlug: s.boolean().optional(),
    body: FreeformObjectSchema.optional(),
    clearBody: s.boolean().optional(),
    data: FreeformObjectSchema.optional()
  },
  { strict: true }
);

export type UpdateEntryInput = Infer<typeof UpdateEntryInputSchema>;
