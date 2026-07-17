import { randomUUID } from "node:crypto";
import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { MEDIA_PACK_PLUGIN_ID } from "../../../plugin/media-pack.constants.js";
import { MediaDirectoryRecordSchema, type MediaDirectoryRecord } from "../media.schemas.js";

const DIRECTORIES_ENTITY_NAME = "directories";

export interface CreateMediaDirectoryInput {
  ownerUserId: string;
  name: string;
  parentId?: string;
  visibility?: MediaDirectoryRecord["visibility"];
  inheritAcl?: boolean;
}

export class MediaDirectoriesRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async create(input: CreateMediaDirectoryInput): Promise<MediaDirectoryRecord> {
    const now = new Date().toISOString();
    const created = await this.repository().insertOne({
      id: randomUUID(),
      ...(input.parentId ? { parentId: input.parentId.trim() } : {}),
      ownerUserId: input.ownerUserId.trim(),
      name: input.name.trim(),
      visibility: input.visibility ?? "private",
      inheritAcl: input.inheritAcl ?? true,
      createdAt: now,
      updatedAt: now
    });
    return MediaDirectoryRecordSchema.parse(created);
  }

  async findById(id: string): Promise<MediaDirectoryRecord | null> {
    return this.repository().findOne({
      filter: { id: id.trim() },
      parse: (value: unknown) => MediaDirectoryRecordSchema.parse(value)
    });
  }

  async list(parentId?: string): Promise<readonly MediaDirectoryRecord[]> {
    return this.repository().findMany({
      filter: parentId === undefined ? undefined : { parentId: parentId.trim() },
      sort: { name: "asc" },
      parse: (value: unknown) => MediaDirectoryRecordSchema.parse(value)
    });
  }

  async update(
    id: string,
    input: {
      name?: string;
      parentId?: string | null;
      visibility?: MediaDirectoryRecord["visibility"];
      inheritAcl?: boolean;
    }
  ): Promise<MediaDirectoryRecord | null> {
    const patch: Partial<MediaDirectoryRecord> = { updatedAt: new Date().toISOString() };
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.parentId !== undefined) patch.parentId = input.parentId?.trim() || undefined;
    if (input.visibility !== undefined) patch.visibility = input.visibility;
    if (input.inheritAcl !== undefined) patch.inheritAcl = input.inheritAcl;
    const updated = await this.repository().updateOne({ filter: { id: id.trim() } }, patch);
    return updated ? MediaDirectoryRecordSchema.parse(updated) : null;
  }

  async softDelete(id: string): Promise<MediaDirectoryRecord | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const deletedAt = new Date().toISOString();
    const updated = await this.repository().updateOne(
      { filter: { id: existing.id } },
      {
        name: `${existing.name.slice(0, 180)}~deleted~${existing.id}`,
        deletedAt,
        updatedAt: deletedAt
      }
    );
    return updated ? MediaDirectoryRecordSchema.parse(updated) : null;
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, MEDIA_PACK_PLUGIN_ID);
    return this.scope.repository<MediaDirectoryRecord>(DIRECTORIES_ENTITY_NAME);
  }
}
