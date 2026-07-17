import {
  apiError,
  createPluginApiResponder,
  HttpController,
  parseQueryNumber,
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
import { MediaProviderRegistry } from "./media-provider-registry.service.js";
import { LocalDiskMediaStorageProvider } from "./providers/local-disk-media-storage.provider.js";
import { MediaAssetsService } from "./services/media-assets.service.js";
import { MediaDirectoriesService } from "./services/media-directories.service.js";
import { MediaStorageConfigService } from "./services/media-storage-config.service.js";
import { createMediaPermissionMiddleware } from "./media-upload.controller.js";
import {
  MediaAccessUrlResponseSchema,
  MediaAclEntriesListResponseSchema,
  MediaApiErrorResponseSchema,
  MediaAssetResponseSchema,
  MediaAssetsListResponseSchema,
  MediaDeletedResponseSchema,
  MediaDirectoriesListResponseSchema,
  MediaDirectoryResponseSchema,
  MediaProviderHealthListResponseSchema
} from "./media-api.schemas.js";

const responder = createPluginApiResponder(MEDIA_PACK_PLUGIN_ID);

const UpdateAssetSchema = s.object(
  {
    displayName: s.string({ trim: true, minLength: 1, maxLength: 255 }).optional(),
    directoryId: s.string({ trim: true, minLength: 1 }).optional(),
    clearDirectory: s.boolean().optional(),
    visibility: s.enum(["private", "restricted", "public"] as const).optional()
  },
  { strict: true }
);

const DirectorySchema = s.object(
  {
    name: s.string({ trim: true, minLength: 1, maxLength: 255 }).optional(),
    parentId: s.string({ trim: true, minLength: 1 }).optional(),
    clearParent: s.boolean().optional(),
    visibility: s.enum(["private", "restricted", "public"] as const).optional(),
    inheritAcl: s.boolean().optional()
  },
  { strict: true }
);

const SharesSchema = s.object(
  {
    grants: s.array(
      s.object(
        {
          principalType: s.enum(["user", "role", "plugin"] as const),
          principalId: s.string({ trim: true, minLength: 1 }),
          actions: s.array(s.enum(["read", "write", "manage", "share"] as const), {
            unique: true
          }),
          expiresAt: s.dateTimeString().optional()
        },
        { strict: true }
      )
    )
  },
  { strict: true }
);

/** Domain HTTP surface for assets, directories, sharing and delivery URLs. */
export class MediaAssetsController extends HttpController {
  private readonly authenticated: HttpMiddleware;
  private readonly canRead: HttpMiddleware;
  private readonly canUpdate: HttpMiddleware;
  private readonly canDelete: HttpMiddleware;
  private readonly canManageDirectories: HttpMiddleware;
  private readonly canManageShares: HttpMiddleware;
  private readonly canManageSettings: HttpMiddleware;

  constructor(
    private readonly assets: MediaAssetsService,
    private readonly directories: MediaDirectoriesService,
    private readonly providers: MediaProviderRegistry,
    private readonly storageConfig: MediaStorageConfigService,
    auth: JwtAuthService,
    authz: AuthzService
  ) {
    super();
    this.authenticated = createJwtAuthMiddleware(auth, { requireAdmin: false });
    this.canRead = createMediaPermissionMiddleware(authz, "assets", "read");
    this.canUpdate = createMediaPermissionMiddleware(authz, "assets", "update");
    this.canDelete = createMediaPermissionMiddleware(authz, "assets", "delete");
    this.canManageDirectories = createMediaPermissionMiddleware(authz, "directories", "manage");
    this.canManageShares = createMediaPermissionMiddleware(authz, "shares", "manage");
    this.canManageSettings = createMediaPermissionMiddleware(authz, "settings", "manage");
  }

  routes() {
    return this.router()
      .get("/v1/media/assets", this.listAssets, {
        middlewares: [this.authenticated, this.canRead],
        docs: {
          summary: "List accessible media assets",
          tags: ["Media"],
          operationId: "listMediaAssets",
          security: [{ bearerAuth: [] }],
          parameters: [
            queryParameter("directoryId", { type: "string" }),
            queryParameter("rootOnly", { type: "boolean" }),
            queryParameter("limit", { type: "integer", minimum: 1, maximum: 500 }),
            queryParameter("offset", { type: "integer", minimum: 0 })
          ],
          responses: okResponse("Media assets list", MediaAssetsListResponseSchema)
        }
      })
      .get("/v1/media/assets/:id", this.getAsset, {
        middlewares: [this.authenticated, this.canRead],
        docs: mediaDocs(
          "Get a media asset",
          "getMediaAsset",
          "Media asset",
          MediaAssetResponseSchema
        )
      })
      .patch("/v1/media/assets/:id", this.updateAsset, {
        middlewares: [this.authenticated, this.canUpdate],
        docs: mediaDocs(
          "Update or move a media asset",
          "updateMediaAsset",
          "Updated media asset",
          MediaAssetResponseSchema,
          UpdateAssetSchema
        )
      })
      .delete("/v1/media/assets/:id", this.deleteAsset, {
        middlewares: [this.authenticated, this.canDelete],
        docs: mediaDocs(
          "Soft-delete a media asset",
          "deleteMediaAsset",
          "Deleted media asset",
          MediaAssetResponseSchema
        )
      })
      .post("/v1/media/assets/:id/access-url", this.accessUrl, {
        middlewares: [this.authenticated, this.canRead],
        docs: {
          ...mediaDocs(
            "Create a temporary media access URL",
            "createMediaAccessUrl",
            "Temporary access URL",
            MediaAccessUrlResponseSchema
          ),
          parameters: [
            queryParameter("expiresInSeconds", { type: "integer", minimum: 1, maximum: 3600 })
          ]
        }
      })
      .get("/v1/media/local/:storageKey", this.deliverLocalAsset, {
        docs: {
          summary: "Deliver a local media object using a signed URL",
          tags: ["Media"],
          operationId: "deliverLocalMediaAsset",
          parameters: [
            queryParameter("expires", { type: "integer" }, true),
            queryParameter("signature", { type: "string" }, true)
          ],
          responses: {
            200: { description: "Media bytes", schema: { type: "string", format: "binary" } },
            404: {
              description: "Media object not found",
              schema: toOpenApiSchema(MediaApiErrorResponseSchema)
            }
          }
        }
      })
      .get("/v1/media/providers/health", this.providerHealth, {
        middlewares: [this.authenticated, this.canManageSettings],
        docs: mediaDocs(
          "Check media storage providers",
          "getMediaProviderHealth",
          "Provider health",
          MediaProviderHealthListResponseSchema
        )
      })
      .get("/v1/media/assets/:id/shares", this.listShares, {
        middlewares: [this.authenticated, this.canManageShares],
        docs: mediaDocs(
          "List media asset shares",
          "listMediaAssetShares",
          "Media asset shares",
          MediaAclEntriesListResponseSchema
        )
      })
      .put("/v1/media/assets/:id/shares", this.replaceShares, {
        middlewares: [this.authenticated, this.canManageShares],
        docs: mediaDocs(
          "Replace media asset shares",
          "replaceMediaAssetShares",
          "Updated media asset shares",
          MediaAclEntriesListResponseSchema,
          SharesSchema
        )
      })
      .delete("/v1/media/assets/:id/shares/:shareId", this.deleteShare, {
        middlewares: [this.authenticated, this.canManageShares],
        docs: mediaDocs(
          "Remove a media asset share",
          "deleteMediaAssetShare",
          "Media asset share removed",
          MediaDeletedResponseSchema
        )
      })
      .get("/v1/media/directories/:id/shares", this.listDirectoryShares, {
        middlewares: [this.authenticated, this.canManageShares],
        docs: mediaDocs(
          "List media directory shares",
          "listMediaDirectoryShares",
          "Media directory shares",
          MediaAclEntriesListResponseSchema
        )
      })
      .put("/v1/media/directories/:id/shares", this.replaceDirectoryShares, {
        middlewares: [this.authenticated, this.canManageShares],
        docs: mediaDocs(
          "Replace media directory shares",
          "replaceMediaDirectoryShares",
          "Updated media directory shares",
          MediaAclEntriesListResponseSchema,
          SharesSchema
        )
      })
      .delete("/v1/media/directories/:id/shares/:shareId", this.deleteDirectoryShare, {
        middlewares: [this.authenticated, this.canManageShares],
        docs: mediaDocs(
          "Remove a media directory share",
          "deleteMediaDirectoryShare",
          "Media directory share removed",
          MediaDeletedResponseSchema
        )
      })
      .get("/v1/media/directories", this.listDirectories, {
        middlewares: [this.authenticated, this.canRead],
        docs: {
          ...mediaDocs(
            "List accessible media directories",
            "listMediaDirectories",
            "Media directories",
            MediaDirectoriesListResponseSchema
          ),
          parameters: [queryParameter("parentId", { type: "string" })]
        }
      })
      .post("/v1/media/directories", this.createDirectory, {
        middlewares: [this.authenticated, this.canManageDirectories],
        docs: mediaDocs(
          "Create a media directory",
          "createMediaDirectory",
          "Created media directory",
          MediaDirectoryResponseSchema,
          DirectorySchema
        )
      })
      .patch("/v1/media/directories/:id", this.updateDirectory, {
        middlewares: [this.authenticated, this.canManageDirectories],
        docs: mediaDocs(
          "Update or move a media directory",
          "updateMediaDirectory",
          "Updated media directory",
          MediaDirectoryResponseSchema,
          DirectorySchema
        )
      })
      .delete("/v1/media/directories/:id", this.deleteDirectory, {
        middlewares: [this.authenticated, this.canManageDirectories],
        docs: mediaDocs(
          "Delete an empty media directory",
          "deleteMediaDirectory",
          "Deleted media directory",
          MediaDirectoryResponseSchema
        )
      })
      .build();
  }

  private listAssets = async (ctx: HttpContext) => {
    try {
      const user = getAuthenticatedUser(ctx);
      const assets = await this.assets.listAssets({
        ...(typeof ctx.query.directoryId === "string"
          ? { directoryId: ctx.query.directoryId }
          : {}),
        ...(ctx.query.rootOnly === "true" ? { rootOnly: true } : {}),
        limit: parseQueryNumber(ctx.query.limit),
        offset: parseQueryNumber(ctx.query.offset)
      });
      const visible = (
        await Promise.all(
          assets.map(async (asset) =>
            (await this.assets.canAccessAsset(asset.id, { userId: user.id }, "read")) ? asset : null
          )
        )
      ).filter((asset): asset is NonNullable<typeof asset> => asset !== null);
      return responder.list(visible);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private getAsset = async (ctx: HttpContext) => {
    const asset = await this.readableAsset(ctx);
    return asset ? responder.success(asset) : responder.notFound("Media asset not found");
  };

  private updateAsset = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    if (!id) return responder.invalidRequest("Missing asset id");
    try {
      const user = getAuthenticatedUser(ctx);
      if (!(await this.assets.canAccessAsset(id, { userId: user.id }, "write"))) return forbidden();
      const input = UpdateAssetSchema.parse(ctx.body);
      if (
        input.directoryId &&
        !(await this.assets.canAccessDirectory(input.directoryId, { userId: user.id }, "write"))
      ) {
        return forbidden();
      }
      const updated = await this.assets.updateAsset(id, {
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.clearDirectory ? { directoryId: null } : {}),
        ...(input.directoryId ? { directoryId: input.directoryId } : {})
      });
      if (!updated) return responder.notFound("Media asset not found");
      const asset =
        input.visibility === undefined
          ? updated
          : await this.assets.updateAssetVisibility(updated.id, input.visibility);
      return asset ? responder.success(asset) : responder.notFound("Media asset not found");
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private deleteAsset = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    if (!id) return responder.invalidRequest("Missing asset id");
    const user = getAuthenticatedUser(ctx);
    if (!(await this.assets.canAccessAsset(id, { userId: user.id }, "manage"))) return forbidden();
    const asset = await this.assets.deleteAsset(id);
    return asset ? responder.success(asset) : responder.notFound("Media asset not found");
  };

  private accessUrl = async (ctx: HttpContext) => {
    const asset = await this.readableAsset(ctx);
    if (!asset) return responder.notFound("Media asset not found");
    if (asset.status !== "ready") return responder.invalidRequest("Media asset is not ready");
    try {
      const expiresInSeconds = parseQueryNumber(ctx.query.expiresInSeconds) ?? 300;
      if (expiresInSeconds < 1 || expiresInSeconds > 3600) {
        return responder.invalidRequest("expiresInSeconds must be between 1 and 3600");
      }
      return responder.success(
        await this.providers
          .get(asset.providerId)
          .createReadUrl({ storageKey: asset.storageKey, expiresInSeconds })
      );
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private listShares = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    if (!id) return responder.invalidRequest("Missing asset id");
    const user = getAuthenticatedUser(ctx);
    if (!(await this.assets.canAccessAsset(id, { userId: user.id }, "share"))) return forbidden();
    return responder.list(await this.assets.listAssetShares(id));
  };

  private deliverLocalAsset = async (ctx: HttpContext) => {
    const storageKey = ctx.params.storageKey;
    const expiresAtMs = Number(ctx.query.expires);
    const signature = typeof ctx.query.signature === "string" ? ctx.query.signature : "";
    if (!storageKey || !signature) return responder.notFound("Media object not found");
    try {
      const provider = this.providers.get("local-disk");
      if (!(provider instanceof LocalDiskMediaStorageProvider)) {
        return responder.notFound("Local media storage is not configured");
      }
      const asset = await this.assets.getAssetByStorage("local-disk", storageKey);
      if (!asset || asset.status !== "ready") return responder.notFound("Media object not found");
      const contentType = asset.mimeType.startsWith("text/")
        ? `${asset.mimeType}; charset=utf-8`
        : asset.mimeType;
      return response(provider.openVerifiedReadStream({ storageKey, expiresAtMs, signature }), {
        headers: {
          "cache-control": "private, no-store",
          "content-type": contentType,
          "content-disposition": `inline; filename*=UTF-8''${encodeHeaderFilename(asset.originalFilename)}`,
          "x-content-type-options": "nosniff"
        }
      });
    } catch {
      return responder.notFound("Media object not found");
    }
  };

  private providerHealth = async () => {
    try {
      const selected = await this.storageConfig.resolveDefaultProvider(this.providers);
      const providers = await Promise.all(
        this.providers.list().map(async (provider) => ({
          id: provider.id,
          kind: provider.kind,
          selected: provider.id === selected.id,
          ...(await provider.health())
        }))
      );
      return responder.list(providers);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private replaceShares = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    if (!id) return responder.invalidRequest("Missing asset id");
    try {
      const user = getAuthenticatedUser(ctx);
      if (!(await this.assets.canAccessAsset(id, { userId: user.id }, "share"))) return forbidden();
      const input = SharesSchema.parse(ctx.body);
      const shares = await this.assets.replaceAssetShares(id, user.id, input.grants);
      return responder.list(shares);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private deleteShare = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    const shareId = ctx.params.shareId;
    if (!id || !shareId) return responder.invalidRequest("Missing media asset or share id");
    try {
      const user = getAuthenticatedUser(ctx);
      if (!(await this.assets.canAccessAsset(id, { userId: user.id }, "share"))) return forbidden();
      const removed = await this.assets.removeAssetShare(id, shareId);
      return removed
        ? responder.success({ deleted: true })
        : responder.notFound("Media asset share not found");
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private listDirectories = async (ctx: HttpContext) => {
    try {
      const user = getAuthenticatedUser(ctx);
      const parentId = typeof ctx.query.parentId === "string" ? ctx.query.parentId : undefined;
      const directories = await this.directories.listDirectories(parentId);
      const visible = (
        await Promise.all(
          directories.map(async (directory) =>
            (await this.assets.canAccessDirectory(directory.id, { userId: user.id }, "read"))
              ? directory
              : null
          )
        )
      ).filter((directory): directory is NonNullable<typeof directory> => directory !== null);
      return responder.list(visible);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private createDirectory = async (ctx: HttpContext) => {
    try {
      const user = getAuthenticatedUser(ctx);
      const input = DirectorySchema.parse(ctx.body);
      if (!input.name) return responder.invalidRequest("Directory name is required");
      if (
        input.parentId &&
        !(await this.assets.canAccessDirectory(input.parentId, { userId: user.id }, "write"))
      ) {
        return forbidden();
      }
      return responder.success(
        await this.directories.createDirectory({
          ownerUserId: user.id,
          name: input.name,
          ...(input.parentId ? { parentId: input.parentId } : {}),
          ...(input.visibility ? { visibility: input.visibility } : {}),
          ...(input.inheritAcl !== undefined ? { inheritAcl: input.inheritAcl } : {})
        })
      );
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private updateDirectory = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    if (!id) return responder.invalidRequest("Missing directory id");
    try {
      const user = getAuthenticatedUser(ctx);
      const current = await this.directories.getDirectory(id);
      if (!current) return responder.notFound("Media directory not found");
      if (!(await this.assets.canAccessDirectory(id, { userId: user.id }, "manage")))
        return forbidden();
      const input = DirectorySchema.parse(ctx.body);
      if (
        input.parentId &&
        !(await this.assets.canAccessDirectory(input.parentId, { userId: user.id }, "write"))
      ) {
        return forbidden();
      }
      const directory = await this.directories.updateDirectory(id, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.clearParent ? { parentId: null } : {}),
        ...(input.parentId ? { parentId: input.parentId } : {}),
        ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
        ...(input.inheritAcl !== undefined ? { inheritAcl: input.inheritAcl } : {})
      });
      return directory
        ? responder.success(directory)
        : responder.notFound("Media directory not found");
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private deleteDirectory = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    if (!id) return responder.invalidRequest("Missing directory id");
    try {
      const user = getAuthenticatedUser(ctx);
      const current = await this.directories.getDirectory(id);
      if (!current) return responder.notFound("Media directory not found");
      if (!(await this.assets.canAccessDirectory(id, { userId: user.id }, "manage")))
        return forbidden();
      const directory = await this.directories.deleteDirectory(id);
      return directory
        ? responder.success(directory)
        : responder.notFound("Media directory not found");
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private async readableAsset(ctx: HttpContext) {
    const id = ctx.params.id;
    if (!id) return null;
    const user = getAuthenticatedUser(ctx);
    if (!(await this.assets.canAccessAsset(id, { userId: user.id }, "read"))) return null;
    return this.assets.getAsset(id);
  }

  private listDirectoryShares = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    if (!id) return responder.invalidRequest("Missing directory id");
    const user = getAuthenticatedUser(ctx);
    if (!(await this.assets.canAccessDirectory(id, { userId: user.id }, "share")))
      return forbidden();
    return responder.list(await this.assets.listDirectoryShares(id));
  };

  private replaceDirectoryShares = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    if (!id) return responder.invalidRequest("Missing directory id");
    try {
      const user = getAuthenticatedUser(ctx);
      if (!(await this.assets.canAccessDirectory(id, { userId: user.id }, "share"))) {
        return forbidden();
      }
      const input = SharesSchema.parse(ctx.body);
      return responder.list(await this.assets.replaceDirectoryShares(id, user.id, input.grants));
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private deleteDirectoryShare = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    const shareId = ctx.params.shareId;
    if (!id || !shareId) return responder.invalidRequest("Missing media directory or share id");
    try {
      const user = getAuthenticatedUser(ctx);
      if (!(await this.assets.canAccessDirectory(id, { userId: user.id }, "share"))) {
        return forbidden();
      }
      const removed = await this.assets.removeDirectoryShare(id, shareId);
      return removed
        ? responder.success({ deleted: true })
        : responder.notFound("Media directory share not found");
    } catch (error) {
      return responder.fromError(error);
    }
  };
}

function forbidden() {
  return response(
    apiError("media_access_denied", "Media object access denied", undefined, {
      pluginId: MEDIA_PACK_PLUGIN_ID
    }),
    { status: 403 }
  );
}

function encodeHeaderFilename(value: string) {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

type OpenApiSchemaSource = Parameters<typeof toOpenApiSchema>[0];

function mediaDocs(
  summary: string,
  operationId: string,
  responseDescription: string,
  responseSchema: OpenApiSchemaSource,
  requestSchema?: OpenApiSchemaSource
) {
  return {
    summary,
    tags: ["Media"],
    operationId,
    security: [{ bearerAuth: [] }],
    ...(requestSchema
      ? { requestBody: { required: true, schema: toOpenApiSchema(requestSchema) } }
      : {}),
    responses: okResponse(responseDescription, responseSchema)
  };
}

function okResponse(description: string, schema: OpenApiSchemaSource) {
  return {
    200: { description, schema: toOpenApiSchema(schema) },
    400: {
      description: "Invalid media request",
      schema: toOpenApiSchema(MediaApiErrorResponseSchema)
    }
  };
}

function queryParameter(name: string, schema: Record<string, unknown>, required = false) {
  return { name, in: "query" as const, required, schema };
}
