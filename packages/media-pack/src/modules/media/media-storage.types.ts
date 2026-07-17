export type MediaStorageProviderKind = "local-disk" | "s3-compatible" | "custom";

export interface MediaStoredObject {
  storageKey: string;
  byteSize: number;
  /** First bytes read by a direct-upload provider for server-side signature validation. */
  contentPrefix?: Uint8Array;
  checksum?: {
    algorithm: "sha256";
    value: string;
  };
}

export interface CreateMediaStorageUploadInput {
  uploadId: string;
  storageKey: string;
  contentType?: string;
  expectedByteSize: number;
  checksumSha256?: string;
}

export interface CreateMediaStorageUploadResult {
  method: "proxy" | "presigned";
  uploadUrl: string;
  expiresAt: string;
  requiredHeaders?: Readonly<Record<string, string>>;
}

export interface CompleteMediaStorageUploadInput {
  uploadId: string;
  storageKey: string;
  checksumSha256?: string;
}

export interface CreateMediaStorageReadUrlInput {
  storageKey: string;
  expiresInSeconds: number;
}

export interface MediaStorageProvider {
  readonly id: string;
  readonly kind: MediaStorageProviderKind;
  health(): Promise<{ status: "ok" | "degraded" | "down" }>;
  createUpload(input: CreateMediaStorageUploadInput): Promise<CreateMediaStorageUploadResult>;
  writeUpload(uploadId: string, body: AsyncIterable<Uint8Array>): Promise<void>;
  discardUpload(uploadId: string): Promise<void>;
  completeUpload(input: CompleteMediaStorageUploadInput): Promise<MediaStoredObject>;
  createReadUrl(input: CreateMediaStorageReadUrlInput): Promise<{ url: string; expiresAt: string }>;
  deleteObject(input: { storageKey: string }): Promise<void>;
}

export interface MediaAssetReference {
  assetId: string;
}

export type MediaAssetUsePurpose = "authoring" | "publication" | "delivery";

export interface MediaAssetUseResult {
  assetId: string;
  usable: boolean;
  reason?: "not_found" | "not_ready" | "deleted" | "access_denied" | "not_publishable";
}

export interface MediaAssetsService {
  validateUse(input: {
    references: readonly MediaAssetReference[];
    actor: { userId?: string; pluginId?: string; roleCodes?: readonly string[] };
    purpose: MediaAssetUsePurpose;
  }): Promise<readonly MediaAssetUseResult[]>;
}
