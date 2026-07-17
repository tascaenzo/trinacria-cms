import { s, type Infer } from "@trinacria-cms/kernel";

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
