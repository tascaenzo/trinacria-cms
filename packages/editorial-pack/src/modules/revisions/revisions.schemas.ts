import { defineEntity, type Infer, s } from "@trinacria-cms/kernel";

export const EntryRevisionRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    entryId: s.string({ trim: true, minLength: 1 }),
    revisionNumber: s.number({ int: true, min: 1 }),
    reason: s.string({ trim: true, minLength: 1, maxLength: 80 }),
    snapshotJson: s.string({ trim: true, minLength: 2 }),
    createdByUserId: s.string({ trim: true, minLength: 1 }),
    createdAt: s.dateTimeString()
  },
  { strict: true }
);

export type EntryRevisionRecord = Infer<typeof EntryRevisionRecordSchema>;

/** Revisions are append-only records, kept outside the working entry document. */
export const ENTRY_REVISIONS_ENTITY = defineEntity({
  entityName: "entry_revisions",
  schema: EntryRevisionRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "entry_revisions_id_unique" },
    {
      fields: { entryId: 1, revisionNumber: -1 },
      unique: true,
      name: "entry_revisions_entry_number_unique"
    },
    { fields: { entryId: 1, createdAt: -1 }, name: "entry_revisions_entry_created_idx" }
  ] as const
});
