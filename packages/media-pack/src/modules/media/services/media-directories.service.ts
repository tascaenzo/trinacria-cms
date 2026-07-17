import type { MediaDirectoryRecord } from "../media.schemas.js";
import {
  MediaDirectoriesRepository,
  type CreateMediaDirectoryInput
} from "../repositories/media-directories.repository.js";

export class MediaDirectoriesService {
  constructor(private readonly repository: MediaDirectoriesRepository) {}

  async createDirectory(input: CreateMediaDirectoryInput): Promise<MediaDirectoryRecord> {
    if (input.parentId) {
      const parent = await this.repository.findById(input.parentId);
      if (!parent || parent.deletedAt)
        throw new Error(`Media directory "${input.parentId}" not found`);
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
    if (input.parentId && input.parentId === directoryId) {
      throw new Error("A media directory cannot be its own parent");
    }
    return this.repository.update(directoryId, input);
  }

  async deleteDirectory(directoryId: string): Promise<MediaDirectoryRecord | null> {
    const children = await this.repository.list(directoryId);
    if (children.some((child) => !child.deletedAt)) {
      throw new Error(`Media directory "${directoryId}" is not empty`);
    }
    return this.repository.softDelete(directoryId);
  }
}
