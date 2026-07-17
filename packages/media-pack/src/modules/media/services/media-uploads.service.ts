import type { MediaAssetRecord, MediaUploadSessionRecord } from "../media.schemas.js";
import { MediaProviderRegistry } from "../media-provider-registry.service.js";
import { type CreateMediaAssetInput } from "../repositories/media-assets.repository.js";
import {
  MediaUploadsRepository,
  type CreateMediaUploadSessionInput
} from "../repositories/media-uploads.repository.js";
import type { CreateMediaStorageUploadResult } from "../media-storage.types.js";
import { MediaAssetsService } from "./media-assets.service.js";
import { MediaStorageConfigService } from "./media-storage-config.service.js";
import { MediaDomainEventsService } from "./media-domain-events.service.js";

const UPLOAD_EXPIRY_MS = 15 * 60_000;

export class MediaUploadError extends Error {
  constructor(
    readonly code:
      | "media_upload_not_found"
      | "media_upload_expired"
      | "media_upload_state_invalid"
      | "media_file_too_large"
      | "media_mime_type_denied"
      | "media_content_invalid"
      | "media_checksum_required"
      | "media_byte_size_mismatch"
      | "media_upload_stream_invalid"
      | "media_asset_not_editable",
    message: string
  ) {
    super(message);
  }
}

export interface StartMediaUploadInput {
  ownerUserId: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  checksumSha256?: string;
  directoryId?: string;
  displayName?: string;
  replacementAssetId?: string;
}

export interface StartedMediaUpload {
  session: MediaUploadSessionRecord;
  upload: CreateMediaStorageUploadResult;
}

export class MediaUploadsService {
  constructor(
    private readonly uploads: MediaUploadsRepository,
    private readonly assets: MediaAssetsService,
    private readonly providers: MediaProviderRegistry,
    private readonly config?: MediaStorageConfigService,
    private readonly events?: MediaDomainEventsService
  ) {}

  async startUpload(input: StartMediaUploadInput): Promise<StartedMediaUpload> {
    const mimeType = input.mimeType.trim().toLowerCase();
    const policy = await this.getUploadPolicy();
    if (!policy.allowedMimeTypes.includes(mimeType)) {
      throw new MediaUploadError(
        "media_mime_type_denied",
        `MIME type "${mimeType}" is not allowed`
      );
    }
    if (
      !Number.isInteger(input.byteSize) ||
      input.byteSize < 0 ||
      input.byteSize > policy.maxFileBytes
    ) {
      throw new MediaUploadError(
        "media_file_too_large",
        "Media upload byte size exceeds the configured limit"
      );
    }

    const provider = this.config
      ? await this.config.resolveDefaultProvider(this.providers)
      : this.providers.get("local-disk");
    if (input.replacementAssetId) {
      const replacement = await this.assets.getAsset(input.replacementAssetId);
      if (
        !replacement ||
        replacement.status === "deleted" ||
        !(await this.assets.canAccessAsset(replacement.id, { userId: input.ownerUserId }, "write"))
      ) {
        throw new MediaUploadError(
          "media_asset_not_editable",
          "Media asset cannot be replaced by the current user"
        );
      }
    }
    const checksumSha256 = input.checksumSha256?.trim().toLowerCase();
    if (checksumSha256 && !/^[a-f0-9]{64}$/.test(checksumSha256)) {
      throw new MediaUploadError("media_checksum_required", "SHA-256 checksum must be hexadecimal");
    }
    if (provider.kind === "s3-compatible" && !checksumSha256) {
      throw new MediaUploadError(
        "media_checksum_required",
        "Direct S3-compatible uploads require a SHA-256 checksum"
      );
    }
    const sessionInput: CreateMediaUploadSessionInput = {
      ownerUserId: input.ownerUserId,
      providerId: provider.id,
      ...(input.directoryId ? { directoryId: input.directoryId } : {}),
      ...(input.displayName ? { displayName: input.displayName } : {}),
      ...(input.replacementAssetId ? { replacementAssetId: input.replacementAssetId } : {}),
      originalFilename: input.filename,
      mimeType,
      expectedByteSize: input.byteSize,
      ...(checksumSha256 ? { expectedChecksumSha256: checksumSha256 } : {}),
      expiresAt: new Date(Date.now() + UPLOAD_EXPIRY_MS).toISOString()
    };
    const session = await this.uploads.create(sessionInput);
    try {
      const upload = await provider.createUpload({
        uploadId: session.id,
        storageKey: session.storageKey,
        contentType: session.mimeType,
        expectedByteSize: session.expectedByteSize,
        ...(session.expectedChecksumSha256
          ? { checksumSha256: session.expectedChecksumSha256 }
          : {})
      });
      return { session, upload };
    } catch (error) {
      await this.uploads.markRejected(session.id, "provider_create_upload_failed");
      throw error;
    }
  }

  async receiveContent(input: {
    uploadId: string;
    ownerUserId: string;
    body: AsyncIterable<Uint8Array>;
  }): Promise<MediaUploadSessionRecord> {
    const session = await this.assertActiveSession(input.uploadId, input.ownerUserId, "pending");
    const provider = this.providers.get(session.providerId);
    try {
      await provider.writeUpload(
        session.id,
        validateAndLimitBody(input.body, session.expectedByteSize, session.mimeType)
      );
      return (await this.uploads.markContentReceived(session.id)) ?? session;
    } catch (error) {
      await provider.discardUpload(session.id).catch(() => undefined);
      await this.uploads.markRejected(
        session.id,
        error instanceof Error ? error.message : "upload_failed"
      );
      throw error;
    }
  }

  async cleanupExpired(now = Date.now()): Promise<number> {
    const sessions = await this.uploads.listExpiredActiveSessions(now);
    await Promise.all(
      sessions.map(async (session) => {
        await this.providers
          .get(session.providerId)
          .discardUpload(session.id)
          .catch(() => undefined);
        await this.uploads.markExpired(session.id);
      })
    );
    return sessions.length;
  }

  private async getUploadPolicy() {
    if (this.config) return this.config.getUploadPolicy();
    return {
      maxFileBytes: 25_000_000,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain", "text/csv"]
    };
  }

  async completeUpload(input: {
    uploadId: string;
    ownerUserId: string;
  }): Promise<MediaAssetRecord> {
    const session = await this.assertCompletableSession(input.uploadId, input.ownerUserId);
    const provider = this.providers.get(session.providerId);
    const stored = await provider.completeUpload({
      uploadId: session.id,
      storageKey: session.storageKey,
      ...(session.expectedChecksumSha256 ? { checksumSha256: session.expectedChecksumSha256 } : {})
    });
    if (stored.byteSize !== session.expectedByteSize) {
      await provider.deleteObject({ storageKey: session.storageKey }).catch(() => undefined);
      await this.uploads.markRejected(session.id, "byte_size_mismatch");
      throw new MediaUploadError(
        "media_byte_size_mismatch",
        `Expected ${session.expectedByteSize} bytes but received ${stored.byteSize}`
      );
    }
    if (!stored.checksum) {
      await provider.deleteObject({ storageKey: session.storageKey }).catch(() => undefined);
      await this.uploads.markRejected(session.id, "checksum_missing");
      throw new MediaUploadError(
        "media_upload_state_invalid",
        "Storage provider did not return a checksum"
      );
    }
    if (stored.contentPrefix && !matchesDeclaredMediaType(stored.contentPrefix, session.mimeType)) {
      await provider.deleteObject({ storageKey: session.storageKey }).catch(() => undefined);
      await this.uploads.markRejected(session.id, "content_signature_invalid");
      throw new MediaUploadError(
        "media_content_invalid",
        `Uploaded content does not match declared MIME type "${session.mimeType}"`
      );
    }

    const assetInput: CreateMediaAssetInput = {
      ...(session.directoryId ? { directoryId: session.directoryId } : {}),
      ownerUserId: session.ownerUserId,
      uploadedByUserId: session.ownerUserId,
      displayName: session.displayName,
      originalFilename: session.originalFilename,
      mimeType: session.mimeType,
      byteSize: stored.byteSize,
      checksum: stored.checksum,
      providerId: session.providerId,
      storageKey: stored.storageKey,
      status: "ready",
      visibility: "private"
    };
    try {
      const previous = session.replacementAssetId
        ? await this.assets.getAsset(session.replacementAssetId)
        : null;
      if (
        session.replacementAssetId &&
        (!previous ||
          !(await this.assets.canAccessAsset(previous.id, { userId: session.ownerUserId }, "write")))
      ) {
        throw new MediaUploadError("media_asset_not_editable", "Media asset to replace was not found");
      }
      const asset = previous
        ? await this.assets.replaceAssetContent(previous.id, {
            uploadedByUserId: session.ownerUserId,
            originalFilename: session.originalFilename,
            mimeType: session.mimeType,
            byteSize: stored.byteSize,
            checksum: stored.checksum,
            providerId: session.providerId,
            storageKey: stored.storageKey
          })
        : await this.assets.createAsset(assetInput);
      if (!asset) {
        throw new MediaUploadError("media_asset_not_editable", "Media asset content was not replaced");
      }
      await this.uploads.markCompleted(session.id, asset.id);
      await this.events?.emit("asset-ready", {
        assetId: asset.id,
        mimeType: asset.mimeType,
        visibility: asset.visibility
      });
      if (
        previous &&
        (previous.providerId !== session.providerId || previous.storageKey !== stored.storageKey)
      ) {
        await this.providers
          .get(previous.providerId)
          .deleteObject({ storageKey: previous.storageKey })
          .catch(() => undefined);
      }
      return asset;
    } catch (error) {
      await provider.deleteObject({ storageKey: session.storageKey }).catch(() => undefined);
      await this.uploads.markRejected(session.id, "asset_create_failed");
      throw error;
    }
  }

  private async assertActiveSession(
    uploadId: string,
    ownerUserId: string,
    expectedStatus: MediaUploadSessionRecord["status"]
  ): Promise<MediaUploadSessionRecord> {
    const session = await this.uploads.findById(uploadId);
    if (!session || session.ownerUserId !== ownerUserId.trim()) {
      throw new MediaUploadError(
        "media_upload_not_found",
        `Media upload "${uploadId}" was not found`
      );
    }
    if (Date.parse(session.expiresAt) <= Date.now()) {
      await this.uploads.markExpired(session.id);
      throw new MediaUploadError("media_upload_expired", `Media upload "${uploadId}" has expired`);
    }
    if (session.status !== expectedStatus) {
      throw new MediaUploadError(
        "media_upload_state_invalid",
        `Media upload "${uploadId}" is in state "${session.status}"`
      );
    }
    return session;
  }

  private async assertCompletableSession(uploadId: string, ownerUserId: string) {
    const session = await this.uploads.findById(uploadId);
    if (!session || session.ownerUserId !== ownerUserId.trim()) {
      throw new MediaUploadError(
        "media_upload_not_found",
        `Media upload "${uploadId}" was not found`
      );
    }
    if (Date.parse(session.expiresAt) <= Date.now()) {
      await this.uploads.markExpired(session.id);
      throw new MediaUploadError("media_upload_expired", `Media upload "${uploadId}" has expired`);
    }
    if (session.status === "content_received") return session;
    if (
      session.status === "pending" &&
      this.providers.get(session.providerId).kind === "s3-compatible"
    ) {
      return session;
    }
    throw new MediaUploadError(
      "media_upload_state_invalid",
      `Media upload "${uploadId}" is in state "${session.status}"`
    );
  }
}

async function* validateAndLimitBody(
  body: AsyncIterable<Uint8Array>,
  expectedByteSize: number,
  mimeType: string
): AsyncIterable<Uint8Array> {
  let received = 0;
  const prefix: number[] = [];
  for await (const chunk of body) {
    for (const byte of chunk) {
      if (prefix.length < 16) prefix.push(byte);
    }
    received += chunk.byteLength;
    if (received > expectedByteSize) {
      throw new MediaUploadError(
        "media_file_too_large",
        "Media upload body exceeds its declared size"
      );
    }
    yield chunk;
  }
  if (received !== expectedByteSize) {
    throw new MediaUploadError(
      "media_byte_size_mismatch",
      `Expected ${expectedByteSize} bytes but received ${received}`
    );
  }
  if (!matchesDeclaredMediaType(Uint8Array.from(prefix), mimeType)) {
    throw new MediaUploadError(
      "media_content_invalid",
      `Uploaded content does not match declared MIME type "${mimeType}"`
    );
  }
}

function matchesDeclaredMediaType(bytes: Uint8Array, mimeType: string): boolean {
  const startsWith = (...expected: number[]) =>
    expected.every((value, index) => bytes[index] === value);
  if (mimeType === "image/jpeg") return startsWith(0xff, 0xd8, 0xff);
  if (mimeType === "image/png") return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (mimeType === "image/webp") {
    return startsWith(0x52, 0x49, 0x46, 0x46) && startsWithAt(bytes, 8, 0x57, 0x45, 0x42, 0x50);
  }
  if (mimeType === "application/pdf") return startsWith(0x25, 0x50, 0x44, 0x46, 0x2d);
  if (mimeType.startsWith("text/")) return !bytes.includes(0);
  return false;
}

function startsWithAt(bytes: Uint8Array, offset: number, ...expected: number[]): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}
