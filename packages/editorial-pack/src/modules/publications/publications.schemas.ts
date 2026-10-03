import { type Infer, s } from "@trinacria-cms/kernel";
import { defineEntity } from "@trinacria-cms/kernel/runtime";
import { EntryRecordSchema } from "../entries/entries.schemas.js";

/** Full snapshots are internal records. Public delivery must use an explicit projection. */
export const PublicationSnapshotSchema = s.object(
  {
    id: s.string(),
    entryId: s.string(),
    contentTypeId: s.string(),
    publicationVersion: s.number({ int: true, min: 1 }),
    publishedRevisionId: s.string(),
    publishedAt: s.dateTimeString(),
    entry: EntryRecordSchema
  },
  { strict: true }
);
export const PublicationPointerSchema = s.object(
  {
    id: s.string(),
    entryId: s.string(),
    contentTypeId: s.string(),
    snapshotId: s.string(),
    slug: s.string().optional(),
    publicationVersion: s.number({ int: true, min: 1 }),
    publishedAt: s.dateTimeString()
  },
  { strict: true }
);
export type PublicationSnapshot = Infer<typeof PublicationSnapshotSchema>;
export type PublicationPointer = Infer<typeof PublicationPointerSchema>;
export const PUBLICATION_SNAPSHOTS_ENTITY = defineEntity({
  ownerPluginId: "editorial-pack",
  entityName: "publication_snapshots",
  schema: PublicationSnapshotSchema,
  indexes: [
    { name: "publication_snapshot_id", fields: { id: 1 }, unique: true },
    {
      name: "publication_snapshot_version",
      fields: { entryId: 1, publicationVersion: -1 },
      unique: true
    }
  ]
});
export const PUBLICATION_POINTERS_ENTITY = defineEntity({
  ownerPluginId: "editorial-pack",
  entityName: "publication_pointers",
  schema: PublicationPointerSchema,
  indexes: [
    { name: "publication_pointer_entry", fields: { entryId: 1 }, unique: true },
    {
      name: "publication_pointer_slug",
      fields: { contentTypeId: 1, slug: 1 },
      unique: true,
      partialFilter: { slug: { $type: "string" } }
    },
    { name: "publication_pointer_list", fields: { contentTypeId: 1, publishedAt: -1, entryId: 1 } }
  ]
});
