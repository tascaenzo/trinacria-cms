import type {
  CreatePermissionInput,
  UpdatePermissionStatusInput
} from "./dto/permissions.input.dto.js";
import { type PermissionRecord } from "./permissions.schemas.js";
import { PermissionsRepository } from "./permissions.repository.js";

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
    return this.setPermissionStatus(id, { status: "disabled" });
  }

  async activatePermission(id: string): Promise<PermissionRecord | null> {
    return this.setPermissionStatus(id, { status: "active" });
  }

  private setPermissionStatus(
    id: string,
    input: UpdatePermissionStatusInput
  ): Promise<PermissionRecord | null> {
    return this.repository.updateStatus(id, input);
  }
}
