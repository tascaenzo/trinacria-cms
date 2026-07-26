import type { MediaAssetRecord } from "../media.schemas.js";
import type {
  MediaAssetReference,
  MediaAssetsService as MediaAssetsServiceContract,
  MediaAssetUseResult
} from "../media-storage.types.js";
import type {
  CreateMediaAssetInput,
  MediaAssetsRepository,
  ReplaceMediaAssetAccessInput
} from "../repositories/media-assets.repository.js";
import type { MediaDirectoriesRepository } from "../repositories/media-directories.repository.js";
import type { MediaDomainEventsService } from "./media-domain-events.service.js";

export class MediaAssetsService implements MediaAssetsServiceContract {
  constructor(
    private readonly repository: MediaAssetsRepository,
    private readonly directories?: MediaDirectoriesRepository,
    private readonly events?: MediaDomainEventsService
  ) {}

  async createAsset(input: CreateMediaAssetInput): Promise<MediaAssetRecord> {
    return this.repository.create(input);
  }

  async getAsset(assetId: string): Promise<MediaAssetRecord | null> {
    return this.repository.findById(assetId);
  }

  async getAssetByStorage(
    providerId: string,
    storageKey: string
  ): Promise<MediaAssetRecord | null> {
    return this.repository.findByStorage(providerId, storageKey);
  }

  async listAssets(options?: Parameters<MediaAssetsRepository["list"]>[0]) {
    return this.repository.list(options);
  }

  async updateAsset(
    assetId: string,
    input: Parameters<MediaAssetsRepository["updateDetails"]>[1]
  ): Promise<MediaAssetRecord | null> {
    return this.repository.updateDetails(assetId, input);
  }

  async replaceAssetContent(
    assetId: string,
    input: Parameters<MediaAssetsRepository["replaceContent"]>[1]
  ): Promise<MediaAssetRecord | null> {
    return this.repository.replaceContent(assetId, input);
  }

  async updateAssetVisibility(
    assetId: string,
    visibility: MediaAssetRecord["visibility"]
  ): Promise<MediaAssetRecord | null> {
    const updated = await this.repository.updateVisibility(assetId, visibility);
    if (updated) {
      await this.events?.emit("asset-access-changed", {
        assetId: updated.id,
        visibility: updated.visibility,
        aclVersion: updated.aclVersion
      });
    }
    return updated;
  }

  async deleteAsset(assetId: string): Promise<MediaAssetRecord | null> {
    const deleted = await this.repository.softDelete(assetId);
    if (deleted?.deletedAt) {
      await this.events?.emit("asset-deleted", {
        assetId: deleted.id,
        deletedAt: deleted.deletedAt
      });
    }
    return deleted;
  }

  async listDeletedAssetsBefore(cutoff: string) {
    return this.repository.listDeletedBefore(cutoff);
  }

  async hardDeleteAsset(assetId: string): Promise<boolean> {
    return this.repository.hardDelete(assetId);
  }

  async shareAsset(input: ReplaceMediaAssetAccessInput) {
    const entry = await this.repository.replaceAccess(input);
    const asset = await this.repository.bumpAclVersion(input.assetId);
    if (asset) {
      await this.events?.emit("asset-access-changed", {
        assetId: asset.id,
        visibility: asset.visibility,
        aclVersion: asset.aclVersion
      });
    }
    return entry;
  }

  async listAssetShares(assetId: string) {
    return this.repository.listAccessEntries(assetId);
  }

  async removeAssetShare(assetId: string, shareId: string): Promise<boolean> {
    const removed = await this.repository.deleteAccessEntryForTarget("asset", assetId, shareId);
    const asset = removed ? await this.repository.bumpAclVersion(assetId) : null;
    if (asset) {
      await this.events?.emit("asset-access-changed", {
        assetId: asset.id,
        visibility: asset.visibility,
        aclVersion: asset.aclVersion
      });
    }
    return removed;
  }

  async shareDirectory(
    input: Omit<ReplaceMediaAssetAccessInput, "assetId"> & { directoryId: string }
  ) {
    return this.repository.replaceAccessForTarget({
      ...input,
      assetId: input.directoryId,
      targetType: "directory"
    });
  }

  async listDirectoryShares(directoryId: string) {
    return this.repository.listAccessEntriesForTarget("directory", directoryId);
  }

  async replaceAssetShares(
    assetId: string,
    createdByUserId: string,
    grants: readonly MediaGrant[]
  ) {
    const normalized = normalizeGrants(grants);
    const desiredKeys = new Set(normalized.map(principalKey));
    const existing = await this.repository.listAccessEntriesForTarget("asset", assetId);
    await Promise.all(
      existing
        .filter((entry) => !desiredKeys.has(principalKey(entry)))
        .map((entry) => this.repository.deleteAccessEntryForTarget("asset", assetId, entry.id))
    );
    await Promise.all(
      normalized.map((grant) =>
        this.repository.replaceAccess({ assetId, createdByUserId, ...grant })
      )
    );
    const asset = await this.repository.bumpAclVersion(assetId);
    if (asset) {
      await this.events?.emit("asset-access-changed", {
        assetId: asset.id,
        visibility: asset.visibility,
        aclVersion: asset.aclVersion
      });
    }
    return this.repository.listAccessEntriesForTarget("asset", assetId);
  }

  async replaceDirectoryShares(
    directoryId: string,
    createdByUserId: string,
    grants: readonly MediaGrant[]
  ) {
    const normalized = normalizeGrants(grants);
    const desiredKeys = new Set(normalized.map(principalKey));
    const existing = await this.repository.listAccessEntriesForTarget("directory", directoryId);
    await Promise.all(
      existing
        .filter((entry) => !desiredKeys.has(principalKey(entry)))
        .map((entry) =>
          this.repository.deleteAccessEntryForTarget("directory", directoryId, entry.id)
        )
    );
    await Promise.all(
      normalized.map((grant) =>
        this.repository.replaceAccessForTarget({
          ...grant,
          assetId: directoryId,
          createdByUserId,
          targetType: "directory"
        })
      )
    );
    return this.repository.listAccessEntriesForTarget("directory", directoryId);
  }

  async removeDirectoryShare(directoryId: string, shareId: string): Promise<boolean> {
    return this.repository.deleteAccessEntryForTarget("directory", directoryId, shareId);
  }

  async canAccessAsset(
    assetId: string,
    actor: { userId?: string; pluginId?: string; roleCodes?: readonly string[] },
    action: "read" | "write" | "manage" | "share"
  ): Promise<boolean> {
    const asset = await this.repository.findById(assetId);
    if (!asset || asset.status === "deleted") return false;
    if (asset.ownerUserId === actor.userId) return true;
    if (action === "read" && asset.visibility === "public") return true;
    const entries = [
      ...(await this.repository.listAccessEntries(asset.id)),
      ...(await this.inheritedDirectoryAccessEntries(asset.directoryId))
    ];
    return this.hasAccessEntry(entries, actor, action);
  }

  async canAccessDirectory(
    directoryId: string,
    actor: { userId?: string; pluginId?: string; roleCodes?: readonly string[] },
    action: "read" | "write" | "manage" | "share"
  ): Promise<boolean> {
    if (!this.directories) return false;
    const directory = await this.directories.findById(directoryId);
    if (!directory || directory.deletedAt) return false;
    if (directory.ownerUserId === actor.userId) return true;
    if (action === "read" && directory.visibility === "public") return true;
    return this.hasAccessEntry(
      await this.inheritedDirectoryAccessEntries(directory.id),
      actor,
      action
    );
  }

  async validateUse(input: Parameters<MediaAssetsServiceContract["validateUse"]>[0]) {
    return Promise.all(
      input.references.map(async (reference) => this.validateReference(reference, input))
    );
  }

  private async validateReference(
    reference: MediaAssetReference,
    input: Parameters<MediaAssetsServiceContract["validateUse"]>[0]
  ): Promise<MediaAssetUseResult> {
    const asset = await this.repository.findById(reference.assetId);
    if (!asset) {
      return { assetId: reference.assetId, usable: false, reason: "not_found" };
    }
    if (asset.status === "deleted") {
      return { assetId: asset.id, usable: false, reason: "deleted" };
    }
    if (asset.status !== "ready") {
      return { assetId: asset.id, usable: false, reason: "not_ready" };
    }
    if (input.purpose === "publication" && asset.visibility !== "public") {
      return { assetId: asset.id, usable: false, reason: "not_publishable" };
    }
    if (asset.visibility === "public" || asset.ownerUserId === input.actor.userId) {
      return { assetId: asset.id, usable: true };
    }

    const isAllowed = this.hasAccessEntry(
      [
        ...(await this.repository.listAccessEntries(asset.id)),
        ...(await this.inheritedDirectoryAccessEntries(asset.directoryId))
      ],
      input.actor,
      "read"
    );
    return isAllowed
      ? { assetId: asset.id, usable: true }
      : { assetId: asset.id, usable: false, reason: "access_denied" };
  }

  private hasAccessEntry(
    entries: Awaited<ReturnType<MediaAssetsRepository["listAccessEntries"]>>,
    actor: { userId?: string; pluginId?: string; roleCodes?: readonly string[] },
    action: "read" | "write" | "manage" | "share"
  ): boolean {
    const now = Date.now();
    const principals = new Set([
      ...(actor.userId ? [`user:${actor.userId}`] : []),
      ...(actor.pluginId ? [`plugin:${actor.pluginId}`] : []),
      ...(actor.roleCodes ?? []).map((roleCode) => `role:${roleCode}`)
    ]);
    return entries.some(
      (entry) =>
        principals.has(`${entry.principalType}:${entry.principalId}`) &&
        entry.actions.includes(action) &&
        (!entry.expiresAt || Date.parse(entry.expiresAt) > now)
    );
  }

  private async inheritedDirectoryAccessEntries(directoryId?: string) {
    if (!directoryId || !this.directories) return [];
    const entries = [] as Awaited<ReturnType<MediaAssetsRepository["listAccessEntries"]>>[number][];
    let currentId: string | undefined = directoryId;
    const seen = new Set<string>();
    while (currentId && !seen.has(currentId)) {
      seen.add(currentId);
      const directory = await this.directories.findById(currentId);
      if (!directory || directory.deletedAt) break;
      entries.push(
        ...(await this.repository.listAccessEntriesForTarget("directory", directory.id))
      );
      if (!directory.inheritAcl) break;
      currentId = directory.parentId;
    }
    return entries;
  }
}

type MediaGrant = Omit<ReplaceMediaAssetAccessInput, "assetId" | "createdByUserId">;

function principalKey(grant: Pick<MediaGrant, "principalType" | "principalId">): string {
  return `${grant.principalType}:${grant.principalId.trim()}`;
}

function normalizeGrants(grants: readonly MediaGrant[]): MediaGrant[] {
  const normalized = new Map<string, MediaGrant>();
  for (const grant of grants) {
    if (grant.actions.length === 0) continue;
    normalized.set(principalKey(grant), {
      ...grant,
      principalId: grant.principalId.trim(),
      actions: [...new Set(grant.actions)]
    });
  }
  return [...normalized.values()];
}
