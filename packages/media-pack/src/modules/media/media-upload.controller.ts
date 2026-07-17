import {
  apiError,
  createPluginApiResponder,
  getRequestHeader,
  HttpController,
  response,
  s,
  toOpenApiSchema,
  type AuthzService,
  type HttpContext,
  type HttpMiddleware
} from "@trinacria-cms/kernel";
import {
  createJwtAuthMiddleware,
  getAuthenticatedUser,
  type JwtAuthService
} from "@trinacria-cms/core-pack";
import { MEDIA_PACK_PLUGIN_ID } from "../../plugin/media-pack.constants.js";
import { MediaUploadError, MediaUploadsService } from "./services/media-uploads.service.js";

const responder = createPluginApiResponder(MEDIA_PACK_PLUGIN_ID);

const StartMediaUploadInputSchema = s.object(
  {
    filename: s.string({ trim: true, minLength: 1, maxLength: 500 }),
    mimeType: s.string({ trim: true, toLowerCase: true, minLength: 1, maxLength: 120 }),
    byteSize: s.number({ int: true, min: 0 }),
    checksumSha256: s.string({ trim: true, minLength: 64, maxLength: 64 }).optional(),
    directoryId: s.string({ trim: true, minLength: 1 }).optional(),
    displayName: s.string({ trim: true, minLength: 1, maxLength: 255 }).optional(),
    replacementAssetId: s.string({ trim: true, minLength: 1 }).optional()
  },
  { strict: true }
);

export class MediaUploadController extends HttpController {
  private readonly authenticated: HttpMiddleware;
  private readonly canUpload: HttpMiddleware;

  constructor(
    private readonly uploads: MediaUploadsService,
    auth: JwtAuthService,
    authz: AuthzService
  ) {
    super();
    this.authenticated = createJwtAuthMiddleware(auth, { requireAdmin: false });
    this.canUpload = createMediaPermissionMiddleware(authz, "assets", "upload");
  }

  routes() {
    return this.router()
      .post("/v1/media/uploads", this.startUpload, {
        middlewares: [this.authenticated, this.canUpload],
        docs: {
          summary: "Create a media upload session",
          tags: ["Media"],
          operationId: "startMediaUpload",
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, schema: toOpenApiSchema(StartMediaUploadInputSchema) }
        }
      })
      .put("/v1/media/uploads/:id/content", this.receiveContent, {
        middlewares: [this.authenticated, this.canUpload],
        docs: {
          summary: "Stream content into a media upload session",
          tags: ["Media"],
          operationId: "receiveMediaUploadContent",
          security: [{ bearerAuth: [] }]
        }
      })
      .post("/v1/media/uploads/:id/complete", this.completeUpload, {
        middlewares: [this.authenticated, this.canUpload],
        docs: {
          summary: "Complete a media upload and create the asset",
          tags: ["Media"],
          operationId: "completeMediaUpload",
          security: [{ bearerAuth: [] }]
        }
      })
      .build();
  }

  private startUpload = async (ctx: HttpContext) => {
    try {
      const payload = StartMediaUploadInputSchema.parse(ctx.body);
      const user = getAuthenticatedUser(ctx);
      return responder.success(
        await this.uploads.startUpload({ ...payload, ownerUserId: user.id })
      );
    } catch (error) {
      return toMediaErrorResponse(error);
    }
  };

  private receiveContent = async (ctx: HttpContext) => {
    const uploadId = ctx.params.id;
    if (!uploadId) return responder.invalidRequest("Missing upload id");
    const contentType = getRequestHeader(ctx, "content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("application/octet-stream")) {
      return responder.invalidRequest("Media upload content must use application/octet-stream");
    }
    if (!isAsyncByteIterable(ctx.body)) {
      return responder.invalidRequest("Media upload content stream is missing");
    }
    try {
      const user = getAuthenticatedUser(ctx);
      return responder.success(
        await this.uploads.receiveContent({ uploadId, ownerUserId: user.id, body: ctx.body })
      );
    } catch (error) {
      return toMediaErrorResponse(error);
    }
  };

  private completeUpload = async (ctx: HttpContext) => {
    const uploadId = ctx.params.id;
    if (!uploadId) return responder.invalidRequest("Missing upload id");
    try {
      const user = getAuthenticatedUser(ctx);
      return responder.success(
        await this.uploads.completeUpload({ uploadId, ownerUserId: user.id })
      );
    } catch (error) {
      return toMediaErrorResponse(error);
    }
  };
}

export function createMediaPermissionMiddleware(
  authz: AuthzService,
  resource: string,
  action: string
): HttpMiddleware {
  return async (ctx, next) => {
    const user = getAuthenticatedUser(ctx);
    const decision = await authz.can({
      subjectId: user.id,
      resource,
      action,
      context: { pluginId: MEDIA_PACK_PLUGIN_ID }
    });
    if (!decision.allowed) {
      return response(
        apiError("media_access_denied", decision.reason ?? "Media permission denied", undefined, {
          pluginId: MEDIA_PACK_PLUGIN_ID
        }),
        { status: 403 }
      );
    }
    return next();
  };
}

function isAsyncByteIterable(value: unknown): value is AsyncIterable<Uint8Array> {
  return Boolean(
    value &&
    typeof value === "object" &&
    Symbol.asyncIterator in value &&
    typeof (value as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] === "function"
  );
}

function toMediaErrorResponse(error: unknown) {
  if (!(error instanceof MediaUploadError)) return responder.fromError(error);
  const status =
    error.code === "media_upload_not_found"
      ? 404
      : error.code === "media_upload_expired"
        ? 410
        : error.code === "media_asset_not_editable"
          ? 403
        : error.code === "media_file_too_large"
          ? 413
          : error.code === "media_mime_type_denied"
            ? 415
            : error.code === "media_content_invalid"
              ? 422
              : error.code === "media_checksum_required"
                ? 422
                : 409;
  return response(
    apiError(error.code, error.message, undefined, { pluginId: MEDIA_PACK_PLUGIN_ID }),
    {
      status
    }
  );
}
