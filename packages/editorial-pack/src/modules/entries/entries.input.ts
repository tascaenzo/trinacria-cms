import { type Infer, s } from "@trinacria-cms/kernel";
import { EntryBodySchema } from "./structured-document.js";

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
    body: EntryBodySchema.optional(),
    data: FreeformObjectSchema,
    reviewerUserId: s.string({ trim: true, minLength: 1 }).optional(),
    scheduledAt: s.dateTimeString().optional()
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
    body: EntryBodySchema.optional(),
    clearBody: s.boolean().optional(),
    data: FreeformObjectSchema.optional(),
    reviewerUserId: s.string({ trim: true, minLength: 1 }).optional(),
    clearReviewer: s.boolean().optional(),
    scheduledAt: s.dateTimeString().optional(),
    clearScheduledAt: s.boolean().optional(),
    /** Optimistic locking token returned by GET/create. */
    expectedVersion: s.number({ int: true, min: 1 }).optional()
  },
  { strict: true }
);

export type UpdateEntryInput = Infer<typeof UpdateEntryInputSchema>;

export const TransitionEntryInputSchema = s.object(
  {
    transitionId: s.string({
      trim: true,
      toLowerCase: true,
      minLength: 1,
      maxLength: 80,
      pattern: /^[a-z][a-z0-9_]*$/
    })
  },
  { strict: true }
);

export type TransitionEntryInput = Infer<typeof TransitionEntryInputSchema>;
