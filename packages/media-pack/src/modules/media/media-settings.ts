import type { JsonValue, PluginManifestSetting } from "@trinacria-cms/kernel";
import { MEDIA_PACK_PLUGIN_ID } from "../../plugin/media-pack.constants.js";

export const MEDIA_PACK_SETTING_DEFINITIONS: readonly PluginManifestSetting[] = Object.freeze([
  {
    key: `${MEDIA_PACK_PLUGIN_ID}:storage:default_provider_id`,
    category: "storage",
    description: "ID of the storage provider selected for new media uploads.",
    defaultValue: "local-disk",
    schema: { type: "string", minLength: 1, maxLength: 120 } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${MEDIA_PACK_PLUGIN_ID}:storage:local_root`,
    category: "storage",
    description: "Filesystem root used by the local-disk media storage provider.",
    defaultValue: ".trinacria/media",
    schema: { type: "string", minLength: 1, maxLength: 500 } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${MEDIA_PACK_PLUGIN_ID}:storage:s3_endpoint`,
    category: "storage",
    description: "Optional endpoint for an S3-compatible media storage provider.",
    defaultValue: "",
    schema: { type: "string", maxLength: 500 } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${MEDIA_PACK_PLUGIN_ID}:storage:s3_bucket`,
    category: "storage",
    description: "Bucket used by the S3-compatible media storage provider.",
    defaultValue: "",
    schema: { type: "string", maxLength: 255 } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${MEDIA_PACK_PLUGIN_ID}:storage:s3_region`,
    category: "storage",
    description: "Region used by the S3-compatible media storage provider.",
    defaultValue: "us-east-1",
    schema: { type: "string", minLength: 1, maxLength: 120 } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${MEDIA_PACK_PLUGIN_ID}:storage:s3_access_key`,
    category: "storage",
    description: "Access key used by the S3-compatible media storage provider.",
    schema: { type: "string", maxLength: 1000 } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: true
  },
  {
    key: `${MEDIA_PACK_PLUGIN_ID}:storage:s3_secret_key`,
    category: "storage",
    description: "Secret key used by the S3-compatible media storage provider.",
    schema: { type: "string", maxLength: 1000 } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: true
  },
  {
    key: `${MEDIA_PACK_PLUGIN_ID}:limits:max_file_bytes`,
    category: "limits",
    description: "Maximum accepted byte size for one media upload.",
    defaultValue: 25_000_000,
    schema: { type: "number", minimum: 1, maximum: 5_000_000_000 } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${MEDIA_PACK_PLUGIN_ID}:limits:allowed_mime_types`,
    category: "limits",
    description: "Allowlist of MIME types accepted by media uploads.",
    defaultValue: ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain", "text/csv"],
    schema: {
      type: "array",
      items: { type: "string", minLength: 1, maxLength: 120 },
      uniqueItems: true
    } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${MEDIA_PACK_PLUGIN_ID}:limits:max_image_pixels`,
    category: "limits",
    description: "Maximum width multiplied by height accepted for image uploads.",
    defaultValue: 40_000_000,
    schema: { type: "number", minimum: 1, maximum: 1_000_000_000 } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${MEDIA_PACK_PLUGIN_ID}:retention:deleted_asset_days`,
    category: "retention",
    description: "Days a soft-deleted asset remains recoverable before cleanup.",
    defaultValue: 30,
    schema: { type: "number", minimum: 1, maximum: 3650 } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  }
]);

/**
 * Safe bootstrap values until the settings service is injected into the media
 * runtime. They mirror the manifest defaults above and are not user input.
 */
export const MEDIA_PACK_DEFAULT_UPLOAD_POLICY = Object.freeze({
  providerId: "local-disk",
  maxFileBytes: 25_000_000,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain", "text/csv"]
});
