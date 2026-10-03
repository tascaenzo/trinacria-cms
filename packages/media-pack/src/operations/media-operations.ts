import { CoreError, createToken } from "@trinacria-cms/kernel";
import type { OperationAuthorizer, OperationContext } from "@trinacria-cms/kernel/contracts";
import {
  assertOperationContext,
  operationForbidden,
  operationSubjectId
} from "@trinacria-cms/kernel/runtime";
import type { MediaProviderRegistry } from "../modules/media/media-provider-registry.service.js";
import type { MediaAssetsService } from "../modules/media/services/media-assets.service.js";
import type { MediaDirectoriesService } from "../modules/media/services/media-directories.service.js";
import type {
  MediaUploadsService,
  StartMediaUploadInput
} from "../modules/media/services/media-uploads.service.js";

function actor(context: OperationContext) {
  assertOperationContext(context);
  return {
    ...(context.actor.kind === "user" || context.actor.kind === "plugin" || context.delegation
      ? { userId: operationSubjectId(context) }
      : {}),
    ...(context.actor.kind === "plugin" ? { pluginId: context.actor.pluginId } : {})
  };
}
async function acl(
  context: OperationContext,
  check: (principal: ReturnType<typeof actor>) => Promise<boolean>
): Promise<boolean> {
  if (context.actor.kind === "plugin" && context.delegation)
    return (
      (await check({ pluginId: context.actor.pluginId })) &&
      (await check({ userId: context.delegation.userId }))
    );
  return check(actor(context));
}
export const MEDIA_ASSET_OPERATIONS = createToken<MediaAssetOperations>("MEDIA_ASSET_OPERATIONS");
export const MEDIA_DIRECTORY_OPERATIONS = createToken<MediaDirectoryOperations>(
  "MEDIA_DIRECTORY_OPERATIONS"
);
export const MEDIA_UPLOAD_OPERATIONS =
  createToken<MediaUploadOperations>("MEDIA_UPLOAD_OPERATIONS");
export class MediaAssetOperations {
  constructor(
    private readonly assets: MediaAssetsService,
    private readonly authorizer: OperationAuthorizer,
    private readonly providers: MediaProviderRegistry
  ) {}
  private async assert(
    context: OperationContext,
    id: string,
    access: "read" | "write" | "manage" | "share"
  ) {
    assertOperationContext(context);
    await this.authorizer.assert(context, {
      ownerPluginId: "media-pack",
      resource: access === "share" ? "shares" : "assets",
      action:
        access === "read"
          ? "read"
          : access === "write"
            ? "update"
            : access === "share"
              ? "manage"
              : "delete",
      resourceId: id
    });
    if (!(await acl(context, (principal) => this.assets.canAccessAsset(id, principal, access))))
      throw operationForbidden("media_acl_denied");
  }
  async canAccessAsset(
    context: OperationContext,
    id: string,
    access: "read" | "write" | "manage" | "share"
  ) {
    assertOperationContext(context);
    await this.assert(context, id, access);
    return true;
  }
  async canAccessDirectory(
    context: OperationContext,
    id: string,
    access: "read" | "write" | "manage" | "share"
  ) {
    assertOperationContext(context);
    await this.authorizer.assert(context, {
      ownerPluginId: "media-pack",
      resource: access === "share" ? "shares" : access === "read" ? "assets" : "directories",
      action: access === "read" ? "read" : "manage",
      resourceId: id
    });
    return acl(context, (principal) => this.assets.canAccessDirectory(id, principal, access));
  }
  async getAsset(context: OperationContext, id: string) {
    await this.assert(context, id, "read");
    return this.assets.getAsset(id);
  }
  async listAssets(
    context: OperationContext,
    options: Parameters<MediaAssetsService["listAssets"]>[0] = {}
  ) {
    assertOperationContext(context);
    await this.authorizer.assert(context, {
      ownerPluginId: "media-pack",
      resource: "assets",
      action: "read"
    });
    const limit = options.limit ?? 100,
      offset = options.offset ?? 0;
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isSafeInteger(offset) ||
      offset < 0
    )
      throw new CoreError("validation_error", "Invalid media pagination");
    const visible: NonNullable<Awaited<ReturnType<MediaAssetsService["getAsset"]>>>[] = [];
    let seen = 0;
    // ACL filtering precedes pagination. Scan in bounded batches without retaining hidden records.
    for (let start = 0; visible.length < limit; start += 100) {
      const batch = await this.assets.listAssets({
        directoryId: options.directoryId,
        rootOnly: options.rootOnly,
        status: options.status,
        limit: 100,
        offset: start
      });
      for (const asset of batch)
        if (
          await acl(context, (principal) => this.assets.canAccessAsset(asset.id, principal, "read"))
        ) {
          if (seen++ >= offset) visible.push(asset);
          if (visible.length === limit) break;
        }
      if (batch.length < 100) break;
    }
    return visible;
  }
  async updateAsset(
    context: OperationContext,
    id: string,
    input: Parameters<MediaAssetsService["updateAsset"]>[1]
  ) {
    input = structuredClone(input);
    await this.assert(context, id, "write");
    if (
      input.directoryId &&
      !(await acl(context, (principal) =>
        this.assets.canAccessDirectory(input.directoryId!, principal, "write")
      ))
    )
      throw operationForbidden("media_directory_acl_denied");
    return this.assets.updateAsset(id, input);
  }
  async updateAssetVisibility(
    context: OperationContext,
    id: string,
    visibility: Parameters<MediaAssetsService["updateAssetVisibility"]>[1]
  ) {
    await this.assert(context, id, "write");
    return this.assets.updateAssetVisibility(id, visibility);
  }
  async deleteAsset(context: OperationContext, id: string) {
    await this.assert(context, id, "manage");
    return this.assets.deleteAsset(id);
  }
  async listAssetShares(context: OperationContext, id: string) {
    await this.assert(context, id, "share");
    return this.assets.listAssetShares(id);
  }
  async replaceAssetShares(
    context: OperationContext,
    id: string,
    grants: Parameters<MediaAssetsService["replaceAssetShares"]>[2]
  ) {
    await this.assert(context, id, "share");
    return this.assets.replaceAssetShares(id, operationSubjectId(context), grants);
  }
  async removeAssetShare(context: OperationContext, id: string, shareId: string) {
    await this.assert(context, id, "share");
    return this.assets.removeAssetShare(id, shareId);
  }
  private async directoryShare(context: OperationContext, id: string) {
    assertOperationContext(context);
    await this.authorizer.assert(context, {
      ownerPluginId: "media-pack",
      resource: "shares",
      action: "manage",
      resourceId: id
    });
    if (
      !(await acl(context, (principal) => this.assets.canAccessDirectory(id, principal, "share")))
    )
      throw operationForbidden("media_directory_acl_denied");
  }
  async listDirectoryShares(context: OperationContext, id: string) {
    await this.directoryShare(context, id);
    return this.assets.listDirectoryShares(id);
  }
  async replaceDirectoryShares(
    context: OperationContext,
    id: string,
    grants: Parameters<MediaAssetsService["replaceDirectoryShares"]>[2]
  ) {
    await this.directoryShare(context, id);
    return this.assets.replaceDirectoryShares(id, operationSubjectId(context), grants);
  }
  async removeDirectoryShare(context: OperationContext, id: string, shareId: string) {
    await this.directoryShare(context, id);
    return this.assets.removeDirectoryShare(id, shareId);
  }
  async validateUse(
    context: OperationContext,
    input: Omit<Parameters<MediaAssetsService["validateUse"]>[0], "actor">
  ) {
    assertOperationContext(context);
    await this.authorizer.assert(context, {
      ownerPluginId: "media-pack",
      resource: "assets",
      action: "read"
    });
    const results = await this.assets.validateUse({ ...input, actor: actor(context) });
    if (!context.delegation) return results;
    return Promise.all(
      results.map(async (result) =>
        result.usable &&
        !(await acl(context, (principal) =>
          this.assets.canAccessAsset(result.assetId, principal, "read")
        ))
          ? { ...result, usable: false, reason: "access_denied" as const }
          : result
      )
    );
  }
  async accessUrl(context: OperationContext, id: string, expiresInSeconds = 300) {
    if (!Number.isSafeInteger(expiresInSeconds) || expiresInSeconds < 1 || expiresInSeconds > 3600)
      throw new CoreError("validation_error", "Read URL expiry must be between 1 and 3600 seconds");
    const asset = await this.getAsset(context, id);
    if (!asset || asset.status !== "ready")
      throw new CoreError("not_found", "Media asset not found");
    return this.providers
      .get(asset.providerId)
      .createReadUrl({ storageKey: asset.storageKey, expiresInSeconds });
  }
}
export class MediaDirectoryOperations {
  constructor(
    private readonly directories: MediaDirectoriesService,
    private readonly assets: MediaAssetsService,
    private readonly authorizer: OperationAuthorizer
  ) {}
  private async assert(
    context: OperationContext,
    id?: string,
    access: "read" | "write" | "manage" = "manage"
  ) {
    assertOperationContext(context);
    await this.authorizer.assert(context, {
      ownerPluginId: "media-pack",
      resource: access === "read" ? "assets" : "directories",
      action: access === "read" ? "read" : "manage",
      resourceId: id
    });
    if (
      id &&
      !(await acl(context, (principal) => this.assets.canAccessDirectory(id, principal, access)))
    )
      throw operationForbidden("media_directory_acl_denied");
  }
  async getDirectory(context: OperationContext, id: string) {
    await this.assert(context, id, "read");
    return this.directories.getDirectory(id);
  }
  async listDirectories(context: OperationContext, parentId?: string) {
    await this.assert(context, parentId, "read");
    const records = await this.directories.listDirectories(parentId);
    const visible = await Promise.all(
      records.map(async (record) =>
        (await acl(context, (principal) =>
          this.assets.canAccessDirectory(record.id, principal, "read")
        ))
          ? record
          : null
      )
    );
    return visible.filter((record): record is NonNullable<typeof record> => record !== null);
  }
  async createDirectory(
    context: OperationContext,
    input: Omit<Parameters<MediaDirectoriesService["createDirectory"]>[0], "ownerUserId">
  ) {
    await this.assert(context, input.parentId, "write");
    return this.directories.createDirectory({ ...input, ownerUserId: operationSubjectId(context) });
  }
  async updateDirectory(
    context: OperationContext,
    id: string,
    input: Parameters<MediaDirectoriesService["updateDirectory"]>[1]
  ) {
    input = structuredClone(input);
    await this.assert(context, id);
    if (
      input.parentId &&
      !(await acl(context, (principal) =>
        this.assets.canAccessDirectory(input.parentId!, principal, "write")
      ))
    )
      throw operationForbidden("media_directory_acl_denied");
    return this.directories.updateDirectory(id, input);
  }
  async deleteDirectory(context: OperationContext, id: string) {
    await this.assert(context, id);
    return this.directories.deleteDirectory(id);
  }
}
export class MediaUploadOperations {
  constructor(
    private readonly uploads: MediaUploadsService,
    private readonly assets: MediaAssetsService,
    private readonly authorizer: OperationAuthorizer
  ) {}
  private async assert(context: OperationContext) {
    assertOperationContext(context);
    await this.authorizer.assert(context, {
      ownerPluginId: "media-pack",
      resource: "assets",
      action: "upload"
    });
  }
  async cleanupExpired(context: OperationContext, now = Date.now()) {
    assertOperationContext(context);
    if (context.actor.kind !== "system" || context.actor.purpose !== "media-cleanup")
      throw operationForbidden("system_scope_required");
    await this.authorizer.assert(context, {
      ownerPluginId: "media-pack",
      resource: "assets",
      action: "delete"
    });
    return this.uploads.cleanupExpired(now);
  }
  private async assertSession(context: OperationContext, uploadId: string) {
    const session = await this.uploads.getOwnedSession(uploadId, operationSubjectId(context));
    if (session.replacementAssetId) {
      await this.authorizer.assert(context, {
        ownerPluginId: "media-pack",
        resource: "assets",
        action: "update",
        resourceId: session.replacementAssetId
      });
      if (
        !(await acl(context, (principal) =>
          this.assets.canAccessAsset(session.replacementAssetId!, principal, "write")
        ))
      )
        throw operationForbidden("media_acl_denied");
    }
    if (
      session.directoryId &&
      !(await acl(context, (principal) =>
        this.assets.canAccessDirectory(session.directoryId!, principal, "write")
      ))
    )
      throw operationForbidden("media_directory_acl_denied");
  }
  async startUpload(
    context: OperationContext,
    input: Omit<StartMediaUploadInput, "ownerUserId" | "accessActor">
  ) {
    input = structuredClone(input);
    await this.assert(context);
    if (input.replacementAssetId) {
      await this.authorizer.assert(context, {
        ownerPluginId: "media-pack",
        resource: "assets",
        action: "update",
        resourceId: input.replacementAssetId
      });
      if (
        !(await acl(context, (principal) =>
          this.assets.canAccessAsset(input.replacementAssetId!, principal, "write")
        ))
      )
        throw operationForbidden("media_acl_denied");
    }
    if (
      input.directoryId &&
      !(await acl(context, (principal) =>
        this.assets.canAccessDirectory(input.directoryId!, principal, "write")
      ))
    )
      throw operationForbidden("media_directory_acl_denied");
    return this.uploads.startUpload({
      ...input,
      ownerUserId: operationSubjectId(context),
      accessActor: actor(context)
    });
  }
  async receiveContent(
    context: OperationContext,
    input: Omit<Parameters<MediaUploadsService["receiveContent"]>[0], "ownerUserId" | "accessActor">
  ) {
    input = { ...input };
    await this.assert(context);
    await this.assertSession(context, input.uploadId);
    return this.uploads.receiveContent({ ...input, ownerUserId: operationSubjectId(context) });
  }
  async completeUpload(
    context: OperationContext,
    input: Omit<Parameters<MediaUploadsService["completeUpload"]>[0], "ownerUserId" | "accessActor">
  ) {
    input = structuredClone(input);
    await this.assert(context);
    await this.assertSession(context, input.uploadId);
    return this.uploads.completeUpload({
      ...input,
      ownerUserId: operationSubjectId(context),
      accessActor: actor(context)
    });
  }
}
