import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { basename, dirname, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import type {
  CompleteMediaStorageUploadInput,
  CreateMediaStorageReadUrlInput,
  CreateMediaStorageUploadInput,
  CreateMediaStorageUploadResult,
  MediaStorageProvider,
  MediaStoredObject
} from "../media-storage.types.js";

export interface LocalDiskMediaStorageProviderOptions {
  rootDirectory: string;
  uploadUrlBasePath?: string;
}

/**
 * Local filesystem adapter. Bytes are staged under the provider root, then
 * atomically promoted to their opaque storage key after completion.
 */
export class LocalDiskMediaStorageProvider implements MediaStorageProvider {
  readonly id = "local-disk";
  readonly kind = "local-disk" as const;
  private readonly rootDirectory: string;
  private readonly uploadUrlBasePath: string;
  private readonly readUrlSecret = randomBytes(32);

  constructor(options: LocalDiskMediaStorageProviderOptions) {
    this.rootDirectory = resolve(options.rootDirectory);
    this.uploadUrlBasePath = (options.uploadUrlBasePath ?? "/v1/media/uploads").replace(/\/$/, "");
  }

  async health(): Promise<{ status: "ok" | "degraded" | "down" }> {
    try {
      await mkdir(this.rootDirectory, { recursive: true });
      await stat(this.rootDirectory);
      return { status: "ok" };
    } catch {
      return { status: "down" };
    }
  }

  async createUpload(
    input: CreateMediaStorageUploadInput
  ): Promise<CreateMediaStorageUploadResult> {
    this.assertUploadId(input.uploadId);
    await mkdir(dirname(this.stagingPath(input.uploadId)), { recursive: true });
    return {
      method: "proxy",
      uploadUrl: `${this.uploadUrlBasePath}/${encodeURIComponent(input.uploadId)}/content`,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString()
    };
  }

  async writeUpload(uploadId: string, body: AsyncIterable<Uint8Array>): Promise<void> {
    this.assertUploadId(uploadId);
    const path = this.stagingPath(uploadId);
    await mkdir(dirname(path), { recursive: true });
    await pipeline(body, createWriteStream(path, { flags: "w" }));
  }

  /** Compatibility alias for integrations that use the local provider directly. */
  stageUpload(uploadId: string, body: AsyncIterable<Uint8Array>): Promise<void> {
    return this.writeUpload(uploadId, body);
  }

  async discardUpload(uploadId: string): Promise<void> {
    this.assertUploadId(uploadId);
    await rm(this.stagingPath(uploadId), { force: true });
  }

  async completeUpload(input: CompleteMediaStorageUploadInput): Promise<MediaStoredObject> {
    this.assertUploadId(input.uploadId);
    const source = this.stagingPath(input.uploadId);
    const destination = this.storagePath(input.storageKey);
    const sourceStats = await stat(source);
    if (!sourceStats.isFile()) {
      throw new Error(`Local media upload "${input.uploadId}" is not a file`);
    }
    await mkdir(dirname(destination), { recursive: true });
    const checksum = await this.hashFile(source);
    await rename(source, destination);
    return {
      storageKey: input.storageKey,
      byteSize: sourceStats.size,
      checksum: { algorithm: "sha256", value: checksum }
    };
  }

  async createReadUrl(
    input: CreateMediaStorageReadUrlInput
  ): Promise<{ url: string; expiresAt: string }> {
    await stat(this.storagePath(input.storageKey));
    const expiresAt = new Date(Date.now() + input.expiresInSeconds * 1_000).toISOString();
    const expiresAtMs = Date.parse(expiresAt);
    const signature = this.signReadUrl(input.storageKey, expiresAtMs);
    return {
      url: `/v1/media/local/${encodeURIComponent(input.storageKey)}?expires=${expiresAtMs}&signature=${signature}`,
      expiresAt
    };
  }

  openVerifiedReadStream(input: {
    storageKey: string;
    expiresAtMs: number;
    signature: string;
  }): Readable {
    if (!Number.isSafeInteger(input.expiresAtMs) || input.expiresAtMs <= Date.now()) {
      throw new Error("Media read URL has expired");
    }
    const expected = this.signReadUrl(input.storageKey, input.expiresAtMs);
    const received = Buffer.from(input.signature, "hex");
    const candidate = Buffer.from(expected, "hex");
    if (received.length !== candidate.length || !timingSafeEqual(received, candidate)) {
      throw new Error("Media read URL signature is invalid");
    }
    return createReadStream(this.storagePath(input.storageKey));
  }

  async deleteObject(input: { storageKey: string }): Promise<void> {
    await rm(this.storagePath(input.storageKey), { force: true });
  }

  private stagingPath(uploadId: string): string {
    return this.resolveWithinRoot(".staging", uploadId);
  }

  private storagePath(storageKey: string): string {
    const normalized = storageKey.replace(/\\/g, "/");
    if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..")) {
      throw new Error("Media storage key is invalid");
    }
    return this.resolveWithinRoot(...normalized.split("/"));
  }

  private resolveWithinRoot(...segments: string[]): string {
    const candidate = resolve(this.rootDirectory, ...segments.map((segment) => basename(segment)));
    if (candidate !== this.rootDirectory && !candidate.startsWith(`${this.rootDirectory}${sep}`)) {
      throw new Error("Media storage path escapes the local provider root");
    }
    return candidate;
  }

  private assertUploadId(uploadId: string): void {
    if (!/^[a-zA-Z0-9_-]{1,160}$/.test(uploadId)) {
      throw new Error("Media upload id is invalid");
    }
  }

  private async hashFile(path: string): Promise<string> {
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(path)) {
      hash.update(chunk);
    }
    return hash.digest("hex");
  }

  private signReadUrl(storageKey: string, expiresAtMs: number): string {
    return createHmac("sha256", this.readUrlSecret)
      .update(`${storageKey}:${expiresAtMs}`)
      .digest("hex");
  }
}
