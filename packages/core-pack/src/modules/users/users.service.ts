import type {
  CreateUserInput,
  UpdateUserProfileInput,
  UpdateUserStatusInput
} from "./dto/users.input.dto.js";
import type { EventBus } from "@trinacria/events";
import type { UserRecord } from "./users.schemas.js";
import { UsersRepository } from "./users.repository.js";
import {
  CORE_PACK_USER_CREATED_EVENT,
  CORE_PACK_USER_PROFILE_UPDATED_EVENT,
  CORE_PACK_USER_STATUS_CHANGED_EVENT,
  publishCorePackUserEvent,
  type CorePackUserEventSource,
  type CorePackUserStatusChangedPayload
} from "./users.events.js";

/**
 * Application service for user lifecycle operations.
 */
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly events?: EventBus
  ) {}

  async createUser(
    input: CreateUserInput,
    options?: { source?: CorePackUserEventSource }
  ): Promise<UserRecord> {
    const existing = await this.repository.findByEmail(input.email);
    if (existing) {
      throw new Error(`User with email "${input.email}" already exists`);
    }
    const created = await this.repository.create(input);
    await publishCorePackUserEvent(this.events, CORE_PACK_USER_CREATED_EVENT, {
      userId: created.id,
      status: created.status,
      source: options?.source ?? "admin"
    });
    return created;
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    return this.repository.findById(id);
  }

  async listUsers(options?: { limit?: number; offset?: number }): Promise<readonly UserRecord[]> {
    return this.repository.list({
      limit: options?.limit,
      offset: options?.offset
    });
  }

  async suspendUser(id: string): Promise<UserRecord | null> {
    return this.setUserStatus(id, { status: "suspended" }, { reason: "admin" });
  }

  async activateUser(id: string): Promise<UserRecord | null> {
    return this.setUserStatus(id, { status: "active" }, { reason: "admin" });
  }

  async updateUserProfile(id: string, input: UpdateUserProfileInput): Promise<UserRecord | null> {
    const existing = await this.repository.findById(id);
    if (!existing) return null;
    const updated = await this.repository.updateProfile(id, input);
    if (!updated) return null;
    const changedFields = (["firstName", "lastName"] as const).filter(
      (field) => existing[field] !== updated[field]
    );
    if (changedFields.length > 0) {
      await publishCorePackUserEvent(this.events, CORE_PACK_USER_PROFILE_UPDATED_EVENT, {
        userId: updated.id,
        changedFields
      });
    }
    if (existing.status !== updated.status) {
      await publishCorePackUserEvent(this.events, CORE_PACK_USER_STATUS_CHANGED_EVENT, {
        userId: updated.id,
        previousStatus: existing.status,
        status: updated.status,
        reason: "admin"
      });
    }
    return updated;
  }

  private async setUserStatus(
    id: string,
    input: UpdateUserStatusInput,
    options?: { reason?: CorePackUserStatusChangedPayload["reason"] }
  ): Promise<UserRecord | null> {
    const existing = await this.repository.findById(id);
    if (!existing) return null;
    const updated = await this.repository.updateStatus(id, input);
    if (!updated) return null;
    if (existing.status !== updated.status) {
      await publishCorePackUserEvent(this.events, CORE_PACK_USER_STATUS_CHANGED_EVENT, {
        userId: updated.id,
        previousStatus: existing.status,
        status: updated.status,
        ...(options?.reason ? { reason: options.reason } : {})
      });
    }
    return updated;
  }
}
