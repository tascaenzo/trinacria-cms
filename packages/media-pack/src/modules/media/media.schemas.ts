import { defineEntity, s, type Infer } from "@trinacria-cms/kernel";

export const MediaAssetStatusSchema = s.enum([
  "uploading",
  "processing",
  "ready",
  "rejected",
  "quarantined",
  "deleted"
] as const);
export const MediaAssetVisibilitySchema = s.enum(["private", "restricted", "public"] as const);
export const MediaPrincipalTypeSchema = s.enum(["user", "role", "plugin"] as const);
export const MediaAclActionSchema = s.enum(["read", "write", "manage", "share"] as const);
export const MediaUploadStatusSchema = s.enum([
  "pending",
  "content_received",
  "completed",
  "rejected",
  "expired"
] as const);

export const MediaAssetRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    directoryId: s.string({ trim: true, minLength: 1 }).optional(),
    ownerUserId: s.string({ trim: true, minLength: 1 }),
    uploadedByUserId: s.string({ trim: true, minLength: 1 }),
    displayName: s.string({ trim: true, minLength: 1, maxLength: 255 }),
    originalFilename: s.string({ trim: true, minLength: 1, maxLength: 500 }),
    mimeType: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    byteSize: s.number({ min: 0 }),
    checksum: s.object(
      {
        algorithm: s.literal("sha256"),
        value: s.string({ trim: true, minLength: 64, maxLength: 64 })
      },
      { strict: true }
    ),
    width: s.number({ int: true, min: 1 }).optional(),
    height: s.number({ int: true, min: 1 }).optional(),
    durationMs: s.number({ int: true, min: 1 }).optional(),
    providerId: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    storageKey: s.string({ trim: true, minLength: 1, maxLength: 1024 }),
    status: MediaAssetStatusSchema,
    visibility: MediaAssetVisibilitySchema,
    aclVersion: s.number({ int: true, min: 1 }),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString(),
    deletedAt: s.dateTimeString().optional()
  },
  { strict: true }
);

export type MediaAssetRecord = Infer<typeof MediaAssetRecordSchema>;

export const MediaDirectoryRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    parentId: s.string({ trim: true, minLength: 1 }).optional(),
    name: s.string({ trim: true, minLength: 1, maxLength: 255 }),
    ownerUserId: s.string({ trim: true, minLength: 1 }),
    visibility: MediaAssetVisibilitySchema,
    inheritAcl: s.boolean(),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString(),
    deletedAt: s.dateTimeString().optional()
  },
  { strict: true }
);

export type MediaDirectoryRecord = Infer<typeof MediaDirectoryRecordSchema>;

export const MediaAclEntryRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    targetType: s.enum(["asset", "directory"] as const),
    targetId: s.string({ trim: true, minLength: 1 }),
    principalType: MediaPrincipalTypeSchema,
    principalId: s.string({ trim: true, minLength: 1 }),
    actions: s.array(MediaAclActionSchema, { unique: true }),
    createdByUserId: s.string({ trim: true, minLength: 1 }),
    expiresAt: s.dateTimeString().optional(),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type MediaAclEntryRecord = Infer<typeof MediaAclEntryRecordSchema>;

export const MediaUploadSessionRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    ownerUserId: s.string({ trim: true, minLength: 1 }),
    providerId: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    storageKey: s.string({ trim: true, minLength: 1, maxLength: 1024 }),
    replacementAssetId: s.string({ trim: true, minLength: 1 }).optional(),
    directoryId: s.string({ trim: true, minLength: 1 }).optional(),
    displayName: s.string({ trim: true, minLength: 1, maxLength: 255 }),
    originalFilename: s.string({ trim: true, minLength: 1, maxLength: 500 }),
    mimeType: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    expectedByteSize: s.number({ int: true, min: 0 }),
    expectedChecksumSha256: s.string({ trim: true, minLength: 64, maxLength: 64 }).optional(),
    status: MediaUploadStatusSchema,
    expiresAt: s.dateTimeString(),
    assetId: s.string({ trim: true, minLength: 1 }).optional(),
    rejectionReason: s.string({ trim: true, minLength: 1, maxLength: 500 }).optional(),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type MediaUploadSessionRecord = Infer<typeof MediaUploadSessionRecordSchema>;

export const MEDIA_ASSETS_ENTITY = defineEntity({
  entityName: "assets",
  schema: MediaAssetRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "assets_id_unique" },
    { fields: { providerId: 1, storageKey: 1 }, unique: true, name: "assets_storage_unique" },
    { fields: { directoryId: 1, status: 1, updatedAt: -1 }, name: "assets_directory_status_idx" },
    { fields: { ownerUserId: 1, createdAt: -1 }, name: "assets_owner_created_idx" },
    { fields: { status: 1, deletedAt: 1 }, name: "assets_deleted_retention_idx" }
  ] as const
});

export const MEDIA_DIRECTORIES_ENTITY = defineEntity({
  entityName: "directories",
  schema: MediaDirectoryRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "directories_id_unique" },
    { fields: { parentId: 1, name: 1 }, unique: true, name: "directories_parent_name_unique" }
  ] as const
});

export const MEDIA_ACL_ENTRIES_ENTITY = defineEntity({
  entityName: "acl_entries",
  schema: MediaAclEntryRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "acl_entries_id_unique" },
    {
      fields: { targetType: 1, targetId: 1, principalType: 1, principalId: 1 },
      unique: true,
      name: "acl_entries_target_principal_unique"
    }
  ] as const
});

export const MEDIA_UPLOADS_ENTITY = defineEntity({
  entityName: "uploads",
  schema: MediaUploadSessionRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "uploads_id_unique" },
    { fields: { ownerUserId: 1, status: 1, createdAt: -1 }, name: "uploads_owner_status_idx" },
    { fields: { status: 1, updatedAt: 1 }, name: "uploads_status_updated_idx" },
    { fields: { expiresAt: 1 }, name: "uploads_expires_at_idx" }
  ] as const
});
