import type { MediaDirectoryRecord } from "../media.schemas.js";
import type { MediaAssetsRepository } from "../repositories/media-assets.repository.js";
import type {
  CreateMediaDirectoryInput,
  MediaDirectoriesRepository
} from "../repositories/media-directories.repository.js";

export class MediaDirectoryError extends Error {
  constructor(
    readonly code:
      | "media_directory_not_found"
      | "media_directory_cycle"
      | "media_directory_not_empty",
    message: string
  ) {
    super(message);
  }
}

export class MediaDirectoriesService {
  constructor(
    private readonly repository: MediaDirectoriesRepository,
    private readonly assets?: MediaAssetsRepository
  ) {}

  async createDirectory(input: CreateMediaDirectoryInput): Promise<MediaDirectoryRecord> {
    if (input.parentId) {
      const parent = await this.repository.findById(input.parentId);
      if (!parent || parent.deletedAt) {
        throw new MediaDirectoryError(
          "media_directory_not_found",
          `Media directory "${input.parentId}" not found`
        );
      }
    }
    return this.repository.create(input);
  }

  async getDirectory(directoryId: string): Promise<MediaDirectoryRecord | null> {
    const directory = await this.repository.findById(directoryId);
    return directory?.deletedAt ? null : directory;
  }

  async listDirectories(parentId?: string): Promise<readonly MediaDirectoryRecord[]> {
    const directories = await this.repository.list(parentId);
    return directories.filter((directory) => !directory.deletedAt);
  }

  async updateDirectory(
    directoryId: string,
    input: Parameters<MediaDirectoriesRepository["update"]>[1]
  ): Promise<MediaDirectoryRecord | null> {
    if (input.parentId) {
      await this.assertValidParent(directoryId, input.parentId);
    }
    return this.repository.update(directoryId, input);
  }

  async deleteDirectory(directoryId: string): Promise<MediaDirectoryRecord | null> {
    const children = await this.repository.list(directoryId);
    if (children.some((child) => !child.deletedAt)) {
      throw new MediaDirectoryError(
        "media_directory_not_empty",
        `Media directory "${directoryId}" contains subdirectories`
      );
    }
    const assets = await this.assets?.list({ directoryId });
    if (assets?.some((asset) => asset.status !== "deleted")) {
      throw new MediaDirectoryError(
        "media_directory_not_empty",
        `Media directory "${directoryId}" contains media assets`
      );
    }
    const deleted = await this.repository.softDelete(directoryId);
    if (deleted) {
      await this.assets?.deleteAccessEntriesForTarget("directory", directoryId);
    }
    return deleted;
  }

  private async assertValidParent(directoryId: string, parentId: string): Promise<void> {
    let currentId: string | undefined = parentId.trim();
    const seen = new Set<string>();
    while (currentId) {
      if (currentId === directoryId || seen.has(currentId)) {
        throw new MediaDirectoryError(
          "media_directory_cycle",
          "A media directory cannot be moved below itself or one of its descendants"
        );
      }
      seen.add(currentId);
      const current = await this.repository.findById(currentId);
      if (!current || current.deletedAt) {
        throw new MediaDirectoryError(
          "media_directory_not_found",
          `Media directory "${currentId}" not found`
        );
      }
      currentId = current.parentId;
    }
  }
}
