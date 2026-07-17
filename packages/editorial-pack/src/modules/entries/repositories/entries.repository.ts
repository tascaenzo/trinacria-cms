import { randomUUID } from "node:crypto";
import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { EDITORIAL_PACK_PLUGIN_ID } from "../../../plugin/editorial-pack.constants.js";
import type { CreateEntryInput, UpdateEntryInput } from "../entries.input.js";
import { EntryRecordSchema, type EntryRecord } from "../entries.schemas.js";

const ENTRIES_ENTITY_NAME = "entries";

export class EntriesRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async create(input: CreateEntryInput & { ownerUserId: string }): Promise<EntryRecord> {
    const now = new Date().toISOString();
    const record = await this.repository().insertOne({
      id: randomUUID(),
      contentTypeId: input.contentTypeId,
      ownerUserId: input.ownerUserId.trim(),
      ...(input.title ? { title: input.title } : {}),
      ...(input.slug ? { slug: input.slug } : {}),
      ...(input.body ? { body: input.body } : {}),
      data: input.data,
      status: "draft" as const,
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
    options: { contentTypeId?: string; ownerUserId?: string; limit?: number; offset?: number } = {}
  ) {
    const filter: Record<string, unknown> = { status: { $ne: "archived" } };
    if (options.contentTypeId) filter.contentTypeId = options.contentTypeId.trim();
    if (options.ownerUserId) filter.ownerUserId = options.ownerUserId.trim();
    return this.repository().findMany({
      filter,
      limit: options.limit,
      offset: options.offset,
      sort: { updatedAt: "desc" },
      parse: (value: unknown) => EntryRecordSchema.parse(value)
    });
  }

  async update(id: string, input: UpdateEntryInput): Promise<EntryRecord | null> {
    const patch: Partial<EntryRecord> = { updatedAt: new Date().toISOString() };
    if (input.title !== undefined) patch.title = input.title;
    if (input.clearTitle) patch.title = undefined;
    if (input.slug !== undefined) patch.slug = input.slug;
    if (input.clearSlug) patch.slug = undefined;
    if (input.body !== undefined) patch.body = input.body;
    if (input.clearBody) patch.body = undefined;
    if (input.data !== undefined) patch.data = input.data;
    const updated = await this.repository().updateOne({ filter: { id: id.trim() } }, patch);
    return updated ? EntryRecordSchema.parse(updated) : null;
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, EDITORIAL_PACK_PLUGIN_ID);
    return this.scope.repository<EntryRecord>(ENTRIES_ENTITY_NAME);
  }
}
