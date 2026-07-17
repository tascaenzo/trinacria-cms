import { s } from "@trinacria-cms/kernel";
import { MEDIA_PACK_PLUGIN_ID } from "../../plugin/media-pack.constants.js";
import {
  MediaAclEntryRecordSchema,
  MediaAssetRecordSchema,
  MediaDirectoryRecordSchema,
  MediaUploadSessionRecordSchema
} from "./media.schemas.js";

export const MediaResponseMetaSchema = s.object(
  {
    pluginId: s.literal(MEDIA_PACK_PLUGIN_ID).optional(),
    count: s.number({ int: true, min: 0 }).optional(),
    limit: s.number({ int: true, min: 0 }).optional(),
    offset: s.number({ int: true, min: 0 }).optional()
  },
  { strict: true }
);

export const MediaApiErrorResponseSchema = s.object(
  {
    error: s.object(
      {
        code: s.string({ trim: true, minLength: 1 }),
        message: s.string({ trim: true, minLength: 1 })
      },
      { strict: false }
    ),
    meta: MediaResponseMetaSchema.optional()
  },
  { strict: true }
);

export const MediaAssetResponseSchema = responseOf(MediaAssetRecordSchema);
export const MediaAssetsListResponseSchema = listResponseOf(MediaAssetRecordSchema);
export const MediaDirectoryResponseSchema = responseOf(MediaDirectoryRecordSchema);
export const MediaDirectoriesListResponseSchema = listResponseOf(MediaDirectoryRecordSchema);
export const MediaAclEntriesListResponseSchema = listResponseOf(MediaAclEntryRecordSchema);
export const MediaUploadSessionResponseSchema = responseOf(MediaUploadSessionRecordSchema);

export const StartedMediaUploadResponseSchema = responseOf(
  s.object(
    {
      session: MediaUploadSessionRecordSchema,
      upload: s.object(
        {
          method: s.enum(["proxy", "presigned"] as const),
          uploadUrl: s.string({ trim: true, minLength: 1 }),
          expiresAt: s.dateTimeString(),
          requiredHeaders: s
            .record(s.string({ minLength: 1 }), s.string({ minLength: 1 }))
            .optional()
        },
        { strict: true }
      )
    },
    { strict: true }
  )
);

export const MediaAccessUrlResponseSchema = responseOf(
  s.object(
    {
      url: s.string({ trim: true, minLength: 1 }),
      expiresAt: s.dateTimeString()
    },
    { strict: true }
  )
);

export const MediaProviderHealthListResponseSchema = listResponseOf(
  s.object(
    {
      id: s.string({ trim: true, minLength: 1 }),
      kind: s.enum(["local-disk", "s3-compatible", "custom"] as const),
      selected: s.boolean(),
      status: s.enum(["ok", "degraded", "down"] as const)
    },
    { strict: true }
  )
);

export const MediaDeletedResponseSchema = responseOf(
  s.object({ deleted: s.literal(true) }, { strict: true })
);

function responseOf<T>(schema: Parameters<typeof s.array<T>>[0]) {
  return s.object(
    {
      data: schema,
      meta: MediaResponseMetaSchema.optional()
    },
    { strict: true }
  );
}

function listResponseOf<T>(schema: Parameters<typeof s.array<T>>[0]) {
  return s.object(
    {
      data: s.array(schema),
      meta: MediaResponseMetaSchema.optional()
    },
    { strict: true }
  );
}
