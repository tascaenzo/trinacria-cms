import { randomUUID } from "node:crypto";
import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { EDITORIAL_PACK_PLUGIN_ID } from "../../../plugin/editorial-pack.constants.js";
import type { CreateEntryInput, UpdateEntryInput } from "../entries.input.js";
import { EntryRecordSchema, type EntryRecord } from "../entries.schemas.js";

const ENTRIES_ENTITY_NAME = "entries";

export class EntriesRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async create(
    input: CreateEntryInput & { ownerUserId: string; initialStatus: EntryRecord["status"] }
  ): Promise<EntryRecord> {
    const now = new Date().toISOString();
    const record = await this.repository().insertOne({
      id: randomUUID(),
      contentTypeId: input.contentTypeId,
      ownerUserId: input.ownerUserId.trim(),
      ...(input.reviewerUserId ? { reviewerUserId: input.reviewerUserId } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.slug ? { slug: input.slug } : {}),
      ...(input.body ? { body: input.body } : {}),
      data: input.data,
      status: input.initialStatus,
      ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
      version: 1,
      createdAt: now,
      updatedAt: now
    });
    return EntryRecordSchema.parse(record);
  }

  async findById(id: string): Promise<EntryRecord | null> {
    return this.repository().findOne({
      filter: { id: id.trim() },
      parse: (value: unknown) => EntryRecordSchema.parse(value)
    });
  }

  async list(
    options: {
      contentTypeId?: string;
      ownerUserId?: string;
      reviewerUserId?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const filter: Record<string, unknown> = {};
    if (options.contentTypeId) filter.contentTypeId = options.contentTypeId.trim();
    if (options.ownerUserId) filter.ownerUserId = options.ownerUserId.trim();
    if (options.reviewerUserId) filter.reviewerUserId = options.reviewerUserId.trim();
    if (options.status) filter.status = options.status.trim();
    return this.repository().findMany({
      filter,
      limit: options.limit,
      offset: options.offset,
      sort: { updatedAt: "desc" },
      parse: (value: unknown) => EntryRecordSchema.parse(value)
    });
  }

  async update(
    id: string,
    input: UpdateEntryInput,
    currentVersion?: number
  ): Promise<EntryRecord | null> {
    const patch: Partial<EntryRecord> = { updatedAt: new Date().toISOString() };
    if (input.title !== undefined) patch.title = input.title;
    if (input.clearTitle) patch.title = undefined;
    if (input.slug !== undefined) patch.slug = input.slug;
    if (input.clearSlug) patch.slug = undefined;
    if (input.body !== undefined) patch.body = input.body;
    if (input.clearBody) patch.body = undefined;
    if (input.data !== undefined) patch.data = input.data;
    if (input.reviewerUserId !== undefined) patch.reviewerUserId = input.reviewerUserId;
    if (input.clearReviewer) patch.reviewerUserId = undefined;
    if (input.scheduledAt !== undefined) patch.scheduledAt = input.scheduledAt;
    if (input.clearScheduledAt) patch.scheduledAt = undefined;
    if (currentVersion !== undefined) patch.version = currentVersion + 1;
    const updated = await this.repository().updateOne(
      { filter: { id: id.trim(), ...(currentVersion !== undefined ? { version: currentVersion } : {}) } },
      patch
    );
    return updated ? EntryRecordSchema.parse(updated) : null;
  }

  async updateStatus(
    id: string,
    status: EntryRecord["status"],
    currentStatus: EntryRecord["status"],
    currentVersion?: number
  ): Promise<EntryRecord | null> {
    const now = new Date().toISOString();
    const updated = await this.repository().updateOne(
      {
        filter: {
          id: id.trim(),
          status: currentStatus,
          ...(currentVersion !== undefined ? { version: currentVersion } : {})
        }
      },
      {
        status,
        ...(status === "published" ? { publishedAt: now } : {}),
        updatedAt: now,
        ...(currentVersion !== undefined ? { version: currentVersion + 1 } : {})
      }
    );
    return updated ? EntryRecordSchema.parse(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    return this.repository().deleteOne({ filter: { id: id.trim() } });
  }

  async restore(
    id: string,
    snapshot: EntryRecord,
    currentVersion?: number
  ): Promise<EntryRecord | null> {
    const updated = await this.repository().updateOne(
      { filter: { id: id.trim(), ...(currentVersion !== undefined ? { version: currentVersion } : {}) } },
      {
        ...(snapshot.title !== undefined ? { title: snapshot.title } : { title: undefined }),
        ...(snapshot.slug !== undefined ? { slug: snapshot.slug } : { slug: undefined }),
        ...(snapshot.body !== undefined ? { body: snapshot.body } : { body: undefined }),
        data: snapshot.data,
        ...(snapshot.reviewerUserId ? { reviewerUserId: snapshot.reviewerUserId } : { reviewerUserId: undefined }),
        ...(snapshot.scheduledAt ? { scheduledAt: snapshot.scheduledAt } : { scheduledAt: undefined }),
        ...(snapshot.publishedAt ? { publishedAt: snapshot.publishedAt } : { publishedAt: undefined }),
        status: snapshot.status,
        updatedAt: new Date().toISOString(),
        ...(currentVersion !== undefined ? { version: currentVersion + 1 } : {})
      }
    );
    return updated ? EntryRecordSchema.parse(updated) : null;
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, EDITORIAL_PACK_PLUGIN_ID);
    return this.scope.repository<EntryRecord>(ENTRIES_ENTITY_NAME);
  }
}
