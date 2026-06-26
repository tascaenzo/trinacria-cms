import type {
  CreatePermissionInput,
  UpdatePermissionInput,
  UpdatePermissionStatusInput
} from "./dto/permissions.input.dto.js";
import { type PermissionRecord } from "./permissions.schemas.js";
import { PermissionsRepository } from "./permissions.repository.js";
import { CORE_PACK_PERMISSION_KEY_LIST } from "../../plugin/core-pack.security.js";

const CORE_PACK_DEFAULT_PERMISSION_KEYS = new Set<string>(CORE_PACK_PERMISSION_KEY_LIST);

/**
 * Application service for permission lifecycle operations.
 */
export class PermissionsService {
  constructor(private readonly repository: PermissionsRepository) {}

  async createPermission(input: CreatePermissionInput): Promise<PermissionRecord> {
    const existing = await this.repository.findByKey(input.key);
    if (existing) {
      throw new Error(`Permission with key "${input.key}" already exists`);
    }
    return this.repository.create(input);
  }

  async getPermissionById(id: string): Promise<PermissionRecord | null> {
    return this.repository.findById(id);
  }

  async listPermissions(options?: {
    limit?: number;
    offset?: number;
  }): Promise<readonly PermissionRecord[]> {
    return this.repository.list({
      limit: options?.limit,
      offset: options?.offset
    });
  }

  async disablePermission(id: string): Promise<PermissionRecord | null> {
    await this.assertPermissionIsEditable(id);
    return this.setPermissionStatus(id, { status: "disabled" });
  }

  async activatePermission(id: string): Promise<PermissionRecord | null> {
    await this.assertPermissionIsEditable(id);
    return this.setPermissionStatus(id, { status: "active" });
  }

  async updatePermission(
    id: string,
    input: UpdatePermissionInput
  ): Promise<PermissionRecord | null> {
    await this.assertPermissionIsEditable(id);
    return this.repository.updateDetails(id, input);
  }

  private setPermissionStatus(
    id: string,
    input: UpdatePermissionStatusInput
  ): Promise<PermissionRecord | null> {
    return this.repository.updateStatus(id, input);
  }

  private async assertPermissionIsEditable(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return;
    }
    if (CORE_PACK_DEFAULT_PERMISSION_KEYS.has(existing.key)) {
      throw new Error(
        `Permission "${existing.key}" is a core-pack default permission and is read-only`
      );
    }
  }
}
