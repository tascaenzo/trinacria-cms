import { type RuntimeConfigService, type SettingsService } from "@trinacria-cms/core-pack";
import { MEDIA_PACK_PLUGIN_ID } from "../../../plugin/media-pack.constants.js";
import { MediaProviderRegistry } from "../media-provider-registry.service.js";
import { MEDIA_PACK_DEFAULT_UPLOAD_POLICY } from "../media-settings.js";
import { LocalDiskMediaStorageProvider } from "../providers/local-disk-media-storage.provider.js";
import { S3MediaStorageProvider } from "../providers/s3-media-storage.provider.js";
import type { MediaStorageProvider } from "../media-storage.types.js";

const PREFIX = `${MEDIA_PACK_PLUGIN_ID}:storage`;
const LIMITS_PREFIX = `${MEDIA_PACK_PLUGIN_ID}:limits`;
const RETENTION_PREFIX = `${MEDIA_PACK_PLUGIN_ID}:retention`;

export interface MediaUploadPolicy {
  maxFileBytes: number;
  maxImagePixels: number;
  allowedMimeTypes: readonly string[];
}

/** Resolves protected/secret provider settings into the currently selected adapter. */
export class MediaStorageConfigService {
  private selectedProviderKey?: string;

  constructor(
    private readonly runtime: RuntimeConfigService,
    private readonly settings: SettingsService
  ) {}

  async resolveDefaultProvider(registry: MediaProviderRegistry): Promise<MediaStorageProvider> {
    const providerId = (
      (await this.runtime.getString(`${PREFIX}:default_provider_id`, {
        fallback: "local-disk"
      })) ?? "local-disk"
    )
      .trim()
      .toLowerCase();
    if (providerId === "local-disk") {
      const rootDirectory =
        (await this.runtime.getString(`${PREFIX}:local_root`, { fallback: ".trinacria/media" })) ??
        ".trinacria/media";
      const providerKey = `local-disk:${rootDirectory}`;
      if (this.selectedProviderKey === providerKey) return registry.get(providerId);
      const provider = new LocalDiskMediaStorageProvider({ rootDirectory });
      registry.replace(provider);
      this.selectedProviderKey = providerKey;
      return provider;
    }
    if (providerId !== "s3-compatible") return registry.get(providerId);
    const [endpoint, bucket, region, accessKeyId, secretAccessKey] = await Promise.all([
      this.runtime.getString(`${PREFIX}:s3_endpoint`, { fallback: "" }),
      this.runtime.getString(`${PREFIX}:s3_bucket`, { fallback: "" }),
      this.runtime.getString(`${PREFIX}:s3_region`, { fallback: "us-east-1" }),
      this.readSecret(`${PREFIX}:s3_access_key`),
      this.readSecret(`${PREFIX}:s3_secret_key`)
    ]);
    if (!bucket?.trim() || !accessKeyId || !secretAccessKey) {
      throw new Error("S3-compatible media storage requires bucket and credentials");
    }
    const providerKey = `s3-compatible:${endpoint ?? ""}:${region ?? ""}:${bucket}:${accessKeyId}:${secretAccessKey}`;
    if (this.selectedProviderKey === providerKey) return registry.get(providerId);
    const provider = new S3MediaStorageProvider({
      ...(endpoint?.trim() ? { endpoint: endpoint.trim() } : {}),
      region: region?.trim() || "us-east-1",
      bucket: bucket.trim(),
      accessKeyId,
      secretAccessKey
    });
    registry.replace(provider);
    this.selectedProviderKey = providerKey;
    return provider;
  }

  async getUploadPolicy(): Promise<MediaUploadPolicy> {
    const [maxFileBytes, maxImagePixels, configuredMimeTypes] = await Promise.all([
      this.runtime.getNumber(`${LIMITS_PREFIX}:max_file_bytes`, {
        fallback: MEDIA_PACK_DEFAULT_UPLOAD_POLICY.maxFileBytes,
        min: 1,
        max: 5_000_000_000
      }),
      this.runtime.getNumber(`${LIMITS_PREFIX}:max_image_pixels`, {
        fallback: 40_000_000,
        min: 1,
        max: 1_000_000_000
      }),
      this.runtime.getJson<unknown>(`${LIMITS_PREFIX}:allowed_mime_types`, {
        fallback: MEDIA_PACK_DEFAULT_UPLOAD_POLICY.allowedMimeTypes
      })
    ]);
    const allowedMimeTypes = Array.isArray(configuredMimeTypes)
      ? configuredMimeTypes
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean)
      : [];
    return {
      maxFileBytes: maxFileBytes ?? MEDIA_PACK_DEFAULT_UPLOAD_POLICY.maxFileBytes,
      maxImagePixels: maxImagePixels ?? MEDIA_PACK_DEFAULT_UPLOAD_POLICY.maxImagePixels,
      allowedMimeTypes: allowedMimeTypes.length
        ? [...new Set(allowedMimeTypes)]
        : MEDIA_PACK_DEFAULT_UPLOAD_POLICY.allowedMimeTypes
    };
  }

  async getDeletedAssetRetentionDays(): Promise<number> {
    return (
      (await this.runtime.getNumber(`${RETENTION_PREFIX}:deleted_asset_days`, {
        fallback: 30,
        min: 1,
        max: 3650
      })) ?? 30
    );
  }

  private async readSecret(key: string): Promise<string | undefined> {
    try {
      const secret = await this.settings.revealSecret(MEDIA_PACK_PLUGIN_ID, key);
      return secret?.value.trim() || undefined;
    } catch {
      return undefined;
    }
  }
}
