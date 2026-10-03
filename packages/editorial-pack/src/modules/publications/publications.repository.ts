import { randomUUID } from "node:crypto";
import type { DbAdapter } from "@trinacria-cms/kernel";
import type { EntryRecord } from "../entries/entries.schemas.js";
import {
  type PublicationPointer,
  PublicationPointerSchema,
  type PublicationSnapshot,
  PublicationSnapshotSchema
} from "./publications.schemas.js";

const namespace = { pluginId: "editorial-pack" };
/** Writes require the same fenced transaction as the entry CAS and revision/outbox. */
export class PublicationsRepository {
  constructor(private readonly db: DbAdapter) {}
  async publish(entry: EntryRecord, publishedRevisionId: string): Promise<PublicationSnapshot> {
    const previous = await this.snapshots().findMany({
      filter: { entryId: entry.id },
      sort: { publicationVersion: "desc" },
      limit: 1
    });
    const snapshot = PublicationSnapshotSchema.parse({
      id: randomUUID(),
      entryId: entry.id,
      contentTypeId: entry.contentTypeId,
      publicationVersion: (previous[0]?.publicationVersion ?? 0) + 1,
      publishedRevisionId,
      publishedAt: new Date().toISOString(),
      entry: structuredClone(entry)
    });
    await this.snapshots().insertOne(snapshot);
    const pointer = PublicationPointerSchema.parse({
      id: entry.id,
      entryId: entry.id,
      contentTypeId: entry.contentTypeId,
      snapshotId: snapshot.id,
      ...(entry.slug ? { slug: entry.slug } : {}),
      publicationVersion: snapshot.publicationVersion,
      publishedAt: snapshot.publishedAt
    });
    const current = await this.getPointer(entry.id);
    if (current) {
      const updated = await this.pointers().updateOne(
        { filter: { entryId: entry.id, snapshotId: current.snapshotId } },
        { ...pointer, slug: entry.slug }
      );
      if (!updated)
        throw Object.assign(new Error("Publication pointer changed"), { code: "conflict" });
    } else await this.pointers().insertOne(pointer);
    return snapshot;
  }
  async unpublish(entryId: string) {
    await this.pointers().deleteOne({ filter: { entryId } });
  }
  async getPointer(entryId: string) {
    return this.pointers().findOne({
      filter: { entryId },
      parse: (value) => PublicationPointerSchema.parse(value)
    });
  }
  async findBySlug(contentTypeId: string, slug: string) {
    return this.pointers().findOne({
      filter: { contentTypeId, slug },
      parse: (value) => PublicationPointerSchema.parse(value)
    });
  }
  async listPointers(contentTypeId: string, limit: number, offset: number) {
    return this.pointers().findMany({
      filter: { contentTypeId },
      limit,
      offset,
      sort: { publishedAt: "desc", entryId: "asc" },
      parse: (value) => PublicationPointerSchema.parse(value)
    });
  }
  async snapshot(pointer: PublicationPointer) {
    return this.snapshots().findOne({
      filter: {
        id: pointer.snapshotId,
        entryId: pointer.entryId,
        contentTypeId: pointer.contentTypeId
      },
      parse: (value) => PublicationSnapshotSchema.parse(value)
    });
  }
  private snapshots() {
    return this.db.repository<PublicationSnapshot>("publication_snapshots", namespace);
  }
  private pointers() {
    return this.db.repository<PublicationPointer>("publication_pointers", namespace);
  }
}
