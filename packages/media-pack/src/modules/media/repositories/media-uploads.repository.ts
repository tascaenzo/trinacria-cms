import { randomUUID } from "node:crypto";
import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { MEDIA_PACK_PLUGIN_ID } from "../../../plugin/media-pack.constants.js";
import { type MediaUploadSessionRecord, MediaUploadSessionRecordSchema } from "../media.schemas.js";

const UPLOADS_ENTITY_NAME = "uploads";

export interface CreateMediaUploadSessionInput {
  ownerUserId: string;
  providerId: string;
  replacementAssetId?: string;
  directoryId?: string;
  displayName?: string;
  originalFilename: string;
  mimeType: string;
  expectedByteSize: number;
  expectedChecksumSha256?: string;
  expiresAt: string;
}

export class MediaUploadsRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async create(input: CreateMediaUploadSessionInput): Promise<MediaUploadSessionRecord> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const originalFilename = input.originalFilename.trim();
    const record = await this.repository().insertOne({
      id,
      ownerUserId: input.ownerUserId.trim(),
      providerId: input.providerId.trim().toLowerCase(),
      storageKey: `assets/${id}`,
      ...(input.replacementAssetId ? { replacementAssetId: input.replacementAssetId.trim() } : {}),
      ...(input.directoryId ? { directoryId: input.directoryId.trim() } : {}),
      displayName: input.displayName?.trim() || originalFilename,
      originalFilename,
      mimeType: input.mimeType.trim().toLowerCase(),
      expectedByteSize: input.expectedByteSize,
      ...(input.expectedChecksumSha256
        ? { expectedChecksumSha256: input.expectedChecksumSha256.trim().toLowerCase() }
        : {}),
      status: "pending" as const,
      expiresAt: input.expiresAt,
      createdAt: now,
      updatedAt: now
    });
    return MediaUploadSessionRecordSchema.parse(record);
  }

  async findById(id: string): Promise<MediaUploadSessionRecord | null> {
    return this.repository().findOne({
      filter: { id: id.trim() },
      parse: (value: unknown) => MediaUploadSessionRecordSchema.parse(value)
    });
  }

  async markContentReceived(id: string): Promise<MediaUploadSessionRecord | null> {
    return this.update(id, { status: "content_received" });
  }

  async markCompleted(id: string, assetId: string): Promise<MediaUploadSessionRecord | null> {
    return this.update(id, { status: "completed", assetId: assetId.trim() });
  }

  async markRejected(id: string, reason: string): Promise<MediaUploadSessionRecord | null> {
    return this.update(id, {
      status: "rejected",
      rejectionReason: reason.trim().slice(0, 500)
    });
  }

  async markExpired(id: string): Promise<MediaUploadSessionRecord | null> {
    return this.update(id, { status: "expired" });
  }

  async listExpiredActiveSessions(now = Date.now()): Promise<readonly MediaUploadSessionRecord[]> {
    return this.repository().findMany({
      filter: {
        status: { $in: ["pending", "content_received"] },
        expiresAt: { $lte: new Date(now).toISOString() }
      },
      parse: (value: unknown) => MediaUploadSessionRecordSchema.parse(value)
    });
  }

  async listTerminalSessionsBefore(cutoff: string): Promise<readonly MediaUploadSessionRecord[]> {
    return this.repository().findMany({
      filter: {
        status: { $in: ["completed", "rejected", "expired"] },
        updatedAt: { $lte: cutoff }
      },
      parse: (value: unknown) => MediaUploadSessionRecordSchema.parse(value)
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.repository().deleteOne({ filter: { id: id.trim() } });
  }

  private async update(
    id: string,
    patch: Partial<Pick<MediaUploadSessionRecord, "status" | "assetId" | "rejectionReason">>
  ): Promise<MediaUploadSessionRecord | null> {
    const updated = await this.repository().updateOne(
      { filter: { id: id.trim() } },
      { ...patch, updatedAt: new Date().toISOString() }
    );
    return updated ? MediaUploadSessionRecordSchema.parse(updated) : null;
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, MEDIA_PACK_PLUGIN_ID);
    return this.scope.repository<MediaUploadSessionRecord>(UPLOADS_ENTITY_NAME);
  }
}
