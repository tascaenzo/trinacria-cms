import { randomUUID } from "node:crypto";
import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { MEDIA_PACK_PLUGIN_ID } from "../../../plugin/media-pack.constants.js";
import {
  type MediaAclEntryRecord,
  MediaAclEntryRecordSchema,
  type MediaAssetRecord,
  MediaAssetRecordSchema
} from "../media.schemas.js";

const ASSETS_ENTITY_NAME = "assets";
const ACL_ENTRIES_ENTITY_NAME = "acl_entries";

export interface CreateMediaAssetInput {
  directoryId?: string;
  ownerUserId: string;
  uploadedByUserId: string;
  displayName: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  checksum: { algorithm: "sha256"; value: string };
  width?: number;
  height?: number;
  durationMs?: number;
  providerId: string;
  storageKey: string;
  status?: MediaAssetRecord["status"];
  visibility?: MediaAssetRecord["visibility"];
}

export interface ReplaceMediaAssetAccessInput {
  assetId: string;
  principalType: "user" | "role" | "plugin";
  principalId: string;
  actions: readonly ("read" | "write" | "manage" | "share")[];
  createdByUserId: string;
  expiresAt?: string;
}

export interface ListMediaAssetsOptions {
  directoryId?: string;
  rootOnly?: boolean;
  status?: MediaAssetRecord["status"];
  limit?: number;
  offset?: number;
}

export class MediaAssetsRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async create(input: CreateMediaAssetInput): Promise<MediaAssetRecord> {
    const now = new Date().toISOString();
    const record = await this.assets().insertOne({
      id: randomUUID(),
      ...(input.directoryId ? { directoryId: input.directoryId.trim() } : {}),
      ownerUserId: input.ownerUserId.trim(),
      uploadedByUserId: input.uploadedByUserId.trim(),
      displayName: input.displayName.trim(),
      originalFilename: input.originalFilename.trim(),
      mimeType: input.mimeType.trim().toLowerCase(),
      byteSize: input.byteSize,
      checksum: input.checksum,
      ...(input.width !== undefined ? { width: input.width } : {}),
      ...(input.height !== undefined ? { height: input.height } : {}),
      ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
      providerId: input.providerId.trim().toLowerCase(),
      storageKey: input.storageKey.trim(),
      status: input.status ?? "ready",
      visibility: input.visibility ?? "private",
      aclVersion: 1,
      createdAt: now,
      updatedAt: now
    });
    return MediaAssetRecordSchema.parse(record);
  }

  async findById(id: string): Promise<MediaAssetRecord | null> {
    return this.assets().findOne({
      filter: { id: id.trim() },
      parse: (value: unknown) => MediaAssetRecordSchema.parse(value)
    });
  }

  async findByStorage(providerId: string, storageKey: string): Promise<MediaAssetRecord | null> {
    return this.assets().findOne({
      filter: {
        providerId: providerId.trim().toLowerCase(),
        storageKey: storageKey.trim()
      },
      parse: (value: unknown) => MediaAssetRecordSchema.parse(value)
    });
  }

  async list(options: ListMediaAssetsOptions = {}): Promise<readonly MediaAssetRecord[]> {
    const filter: Record<string, unknown> = {};
    if (options.directoryId !== undefined) {
      filter.directoryId = options.directoryId.trim();
    } else if (options.rootOnly) {
      filter.directoryId = { $exists: false };
    }
    if (options.status !== undefined) {
      filter.status = options.status;
    }
    return this.assets().findMany({
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      limit: options.limit,
      offset: options.offset,
      sort: { updatedAt: "desc" },
      parse: (value: unknown) => MediaAssetRecordSchema.parse(value)
    });
  }

  async updateDetails(
    id: string,
    input: {
      displayName?: string;
      directoryId?: string | null;
    }
  ): Promise<MediaAssetRecord | null> {
    const patch: Partial<MediaAssetRecord> = { updatedAt: new Date().toISOString() };
    if (input.displayName !== undefined) patch.displayName = input.displayName.trim();
    if (input.directoryId !== undefined) {
      if (input.directoryId === null) {
        patch.directoryId = undefined;
      } else {
        patch.directoryId = input.directoryId.trim();
      }
    }
    const updated = await this.assets().updateOne({ filter: { id: id.trim() } }, patch);
    return updated ? MediaAssetRecordSchema.parse(updated) : null;
  }

  async replaceContent(
    id: string,
    input: {
      uploadedByUserId: string;
      originalFilename: string;
      mimeType: string;
      byteSize: number;
      checksum: MediaAssetRecord["checksum"];
      providerId: string;
      storageKey: string;
      width?: number;
      height?: number;
    }
  ): Promise<MediaAssetRecord | null> {
    const updated = await this.assets().updateOne(
      { filter: { id: id.trim() } },
      {
        uploadedByUserId: input.uploadedByUserId.trim(),
        originalFilename: input.originalFilename.trim(),
        mimeType: input.mimeType.trim().toLowerCase(),
        byteSize: input.byteSize,
        checksum: input.checksum,
        providerId: input.providerId.trim().toLowerCase(),
        storageKey: input.storageKey.trim(),
        status: "ready",
        width: input.width,
        height: input.height,
        durationMs: undefined,
        deletedAt: undefined,
        updatedAt: new Date().toISOString()
      }
    );
    return updated ? MediaAssetRecordSchema.parse(updated) : null;
  }

  async updateVisibility(
    id: string,
    visibility: MediaAssetRecord["visibility"]
  ): Promise<MediaAssetRecord | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updated = await this.assets().updateOne(
      { filter: { id: existing.id } },
      {
        visibility,
        aclVersion: existing.aclVersion + 1,
        updatedAt: new Date().toISOString()
      }
    );
    return updated ? MediaAssetRecordSchema.parse(updated) : null;
  }

  async bumpAclVersion(id: string): Promise<MediaAssetRecord | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updated = await this.assets().updateOne(
      { filter: { id: existing.id } },
      {
        aclVersion: existing.aclVersion + 1,
        updatedAt: new Date().toISOString()
      }
    );
    return updated ? MediaAssetRecordSchema.parse(updated) : null;
  }

  async softDelete(id: string): Promise<MediaAssetRecord | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const deletedAt = new Date().toISOString();
    const updated = await this.assets().updateOne(
      { filter: { id: existing.id } },
      {
        status: "deleted",
        deletedAt,
        updatedAt: deletedAt,
        aclVersion: existing.aclVersion + 1
      }
    );
    return updated ? MediaAssetRecordSchema.parse(updated) : null;
  }

  async listDeletedBefore(cutoff: string): Promise<readonly MediaAssetRecord[]> {
    return this.assets().findMany({
      filter: { status: "deleted", deletedAt: { $lte: cutoff } },
      parse: (value: unknown) => MediaAssetRecordSchema.parse(value)
    });
  }

  async hardDelete(id: string): Promise<boolean> {
    const assetId = id.trim();
    const entries = await this.listAccessEntriesForTarget("asset", assetId);
    await Promise.all(
      entries.map((entry) =>
        this.aclEntries().deleteOne({ filter: { id: entry.id, targetId: assetId } })
      )
    );
    return this.assets().deleteOne({ filter: { id: assetId, status: "deleted" } });
  }

  async listAccessEntries(assetId: string): Promise<readonly MediaAclEntryRecord[]> {
    return this.listAccessEntriesForTarget("asset", assetId);
  }

  async listAccessEntriesForTarget(
    targetType: MediaAclEntryRecord["targetType"],
    targetId: string
  ): Promise<readonly MediaAclEntryRecord[]> {
    return this.aclEntries().findMany({
      filter: { targetType, targetId: targetId.trim() },
      parse: (value: unknown) => MediaAclEntryRecordSchema.parse(value)
    });
  }

  async replaceAccess(input: ReplaceMediaAssetAccessInput): Promise<MediaAclEntryRecord> {
    return this.replaceAccessForTarget({ ...input, targetType: "asset" });
  }

  async deleteAccessEntryForTarget(
    targetType: MediaAclEntryRecord["targetType"],
    targetId: string,
    entryId: string
  ): Promise<boolean> {
    return this.aclEntries().deleteOne({
      filter: {
        id: entryId.trim(),
        targetType,
        targetId: targetId.trim()
      }
    });
  }

  async deleteAccessEntriesForTarget(
    targetType: MediaAclEntryRecord["targetType"],
    targetId: string
  ): Promise<number> {
    const entries = await this.listAccessEntriesForTarget(targetType, targetId);
    const removed = await Promise.all(
      entries.map((entry) => this.deleteAccessEntryForTarget(targetType, targetId, entry.id))
    );
    return removed.filter(Boolean).length;
  }

  async replaceAccessForTarget(
    input: ReplaceMediaAssetAccessInput & { targetType: MediaAclEntryRecord["targetType"] }
  ): Promise<MediaAclEntryRecord> {
    const existing = await this.aclEntries().findOne({
      filter: {
        targetType: input.targetType,
        targetId: input.assetId.trim(),
        principalType: input.principalType,
        principalId: input.principalId.trim()
      },
      parse: (value: unknown) => MediaAclEntryRecordSchema.parse(value)
    });
    const now = new Date().toISOString();
    const record = {
      targetType: input.targetType,
      targetId: input.assetId.trim(),
      principalType: input.principalType,
      principalId: input.principalId.trim(),
      actions: Array.from(new Set(input.actions)),
      createdByUserId: input.createdByUserId.trim(),
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
      updatedAt: now
    };
    if (!existing) {
      const created = await this.aclEntries().insertOne({
        id: randomUUID(),
        ...record,
        createdAt: now
      });
      return MediaAclEntryRecordSchema.parse(created);
    }
    const updated = await this.aclEntries().updateOne({ filter: { id: existing.id } }, record);
    if (!updated) {
      throw new Error(`Media ACL entry for asset "${input.assetId}" disappeared during update`);
    }
    return MediaAclEntryRecordSchema.parse(updated);
  }

  private assets() {
    return this.scopeForPlugin().repository<MediaAssetRecord>(ASSETS_ENTITY_NAME);
  }

  private aclEntries() {
    return this.scopeForPlugin().repository<MediaAclEntryRecord>(ACL_ENTRIES_ENTITY_NAME);
  }

  private scopeForPlugin(): PluginDbScope {
    this.scope = this.scope ?? createPluginDbScope(this.db, MEDIA_PACK_PLUGIN_ID);
    return this.scope;
  }
}
