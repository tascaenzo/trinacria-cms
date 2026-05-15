import type { CreateUserInput, UpdateUserStatusInput } from "./dto/users.input.dto.js";
import type { UserRecord } from "./users.schemas.js";
import { UsersRepository } from "./users.repository.js";

/**
 * Application service for user lifecycle operations.
 */
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const existing = await this.repository.findByEmail(input.email);
    if (existing) {
      throw new Error(`User with email "${input.email}" already exists`);
    }
    return this.repository.create(input);
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
    return this.setUserStatus(id, { status: "suspended" });
  }

  async activateUser(id: string): Promise<UserRecord | null> {
    return this.setUserStatus(id, { status: "active" });
  }

  private setUserStatus(id: string, input: UpdateUserStatusInput): Promise<UserRecord | null> {
    return this.repository.updateStatus(id, input);
  }
}
