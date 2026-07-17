import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import type {
  CompleteMediaStorageUploadInput,
  CreateMediaStorageReadUrlInput,
  CreateMediaStorageUploadInput,
  CreateMediaStorageUploadResult,
  MediaStorageProvider,
  MediaStoredObject
} from "../media-storage.types.js";

export interface S3MediaStorageProviderOptions {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

/** S3-compatible provider using a private staging object and presigned reads. */
export class S3MediaStorageProvider implements MediaStorageProvider {
  readonly id = "s3-compatible";
  readonly kind = "s3-compatible" as const;
  private readonly client: S3Client;

  constructor(private readonly options: S3MediaStorageProviderOptions) {
    this.client = new S3Client({
      region: options.region,
      ...(options.endpoint ? { endpoint: options.endpoint } : {}),
      forcePathStyle: options.forcePathStyle ?? Boolean(options.endpoint),
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey
      }
    });
  }

  async health(): Promise<{ status: "ok" | "degraded" | "down" }> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.options.bucket }));
      return { status: "ok" };
    } catch {
      return { status: "down" };
    }
  }

  async createUpload(
    input: CreateMediaStorageUploadInput
  ): Promise<CreateMediaStorageUploadResult> {
    if (!input.checksumSha256 || !/^[a-f0-9]{64}$/.test(input.checksumSha256)) {
      throw new Error("S3-compatible direct uploads require a hexadecimal SHA-256 checksum");
    }
    const checksumBase64 = Buffer.from(input.checksumSha256, "hex").toString("base64");
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: this.stagingKey(input.uploadId),
        ContentType: input.contentType,
        ContentLength: input.expectedByteSize,
        ChecksumSHA256: checksumBase64
      }),
      { expiresIn: 15 * 60 }
    );
    return {
      method: "presigned",
      uploadUrl,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      requiredHeaders: {
        ...(input.contentType ? { "content-type": input.contentType } : {}),
        "x-amz-checksum-sha256": checksumBase64
      }
    };
  }

  async writeUpload(uploadId: string, body: AsyncIterable<Uint8Array>): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: this.stagingKey(uploadId),
        Body: Readable.from(body),
        ChecksumAlgorithm: "SHA256"
      })
    );
  }

  async discardUpload(uploadId: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.options.bucket, Key: this.stagingKey(uploadId) })
    );
  }

  async completeUpload(input: CompleteMediaStorageUploadInput): Promise<MediaStoredObject> {
    const sourceKey = this.stagingKey(input.uploadId);
    const head = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.options.bucket,
        Key: sourceKey,
        ChecksumMode: "ENABLED"
      })
    );
    if (head.ContentLength === undefined || !head.ChecksumSHA256) {
      throw new Error("S3-compatible storage did not return object length and SHA-256 checksum");
    }
    const checksum = Buffer.from(head.ChecksumSHA256, "base64").toString("hex");
    if (input.checksumSha256 && checksum !== input.checksumSha256) {
      throw new Error("S3-compatible storage checksum does not match the upload session");
    }
    const contentPrefix =
      head.ContentLength === 0
        ? new Uint8Array()
        : await this.readObjectPrefix(sourceKey, head.ContentLength);
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.options.bucket,
        Key: input.storageKey,
        CopySource: `/${this.options.bucket}/${sourceKey
          .split("/")
          .map((part) => encodeURIComponent(part))
          .join("/")}`,
        ChecksumAlgorithm: "SHA256"
      })
    );
    await this.discardUpload(input.uploadId);
    return {
      storageKey: input.storageKey,
      byteSize: head.ContentLength,
      contentPrefix,
      checksum: {
        algorithm: "sha256",
        value: checksum
      }
    };
  }

  async createReadUrl(
    input: CreateMediaStorageReadUrlInput
  ): Promise<{ url: string; expiresAt: string }> {
    const expiresInSeconds = Math.max(1, Math.floor(input.expiresInSeconds));
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.options.bucket, Key: input.storageKey }),
      { expiresIn: expiresInSeconds }
    );
    return { url, expiresAt: new Date(Date.now() + expiresInSeconds * 1_000).toISOString() };
  }

  async deleteObject(input: { storageKey: string }): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.options.bucket, Key: input.storageKey })
    );
  }

  private stagingKey(uploadId: string): string {
    if (!/^[a-zA-Z0-9_-]{1,160}$/.test(uploadId)) throw new Error("Media upload id is invalid");
    return `_trinacria-media-staging/${uploadId}`;
  }

  private async readObjectPrefix(storageKey: string, byteSize: number): Promise<Uint8Array> {
    const lastByte = Math.min(byteSize, 1_048_576) - 1;
    const preview = await this.client.send(
      new GetObjectCommand({
        Bucket: this.options.bucket,
        Key: storageKey,
        Range: `bytes=0-${lastByte}`
      })
    );
    return readBodyPrefix(preview.Body, 1_048_576);
  }
}

async function readBodyPrefix(body: unknown, maxBytes: number): Promise<Uint8Array> {
  if (!body || typeof body !== "object" || !(Symbol.asyncIterator in body)) return new Uint8Array();
  const bytes: number[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    for (const byte of chunk) {
      if (bytes.length < maxBytes) bytes.push(byte);
    }
    if (bytes.length === maxBytes) break;
  }
  return Uint8Array.from(bytes);
}
