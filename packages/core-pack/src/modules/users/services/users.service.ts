import type { EventBus } from "@trinacria/events";
import type {
  CreateUserInput,
  UpdateUserProfileInput,
  UpdateUserStatusInput
} from "../dto/users.input.dto.js";
import type {
  CorePackUserEventSource,
  CorePackUserStatusChangedPayload
} from "../events/user-events.catalog.js";
import type { UsersRepository } from "../repositories/users.repository.js";
import type { UserRecord } from "../users.schemas.js";
import { UserLifecycleEventPublisher } from "./user-lifecycle-event-publisher.js";

/**
 * Application service for user lifecycle operations.
 */
export class UsersService {
  private readonly eventPublisher: UserLifecycleEventPublisher;

  constructor(
    private readonly repository: UsersRepository,
    events?: EventBus
  ) {
    this.eventPublisher = new UserLifecycleEventPublisher(events);
  }

  async createUser(
    input: CreateUserInput,
    options?: { source?: CorePackUserEventSource }
  ): Promise<UserRecord> {
    const existing = await this.repository.findByEmail(input.email);
    if (existing) {
      throw new Error(`User with email "${input.email}" already exists`);
    }
    const created = await this.repository.create(input);
    await this.eventPublisher.userCreated({
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
      await this.eventPublisher.userProfileUpdated({
        userId: updated.id,
        changedFields
      });
    }
    if (existing.status !== updated.status) {
      await this.eventPublisher.userStatusChanged({
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
      await this.eventPublisher.userStatusChanged({
        userId: updated.id,
        previousStatus: existing.status,
        status: updated.status,
        ...(options?.reason ? { reason: options.reason } : {})
      });
    }
    return updated;
  }
}
