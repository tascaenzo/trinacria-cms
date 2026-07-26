import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import {
  type CreateUserInput,
  CreateUserInputSchema,
  type UpdateUserProfileInput,
  UpdateUserProfileInputSchema,
  type UpdateUserStatusInput,
  UpdateUserStatusInputSchema
} from "../dto/users.input.dto.js";
import { type UserRecord, UserRecordSchema } from "../users.schemas.js";

const USERS_ENTITY_NAME = "users";

/**
 * Persistence adapter for users module over kernel DbAdapter.
 */
export class UsersRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async create(input: CreateUserInput): Promise<UserRecord> {
    const parsedInput = CreateUserInputSchema.parse(input);

    const now = new Date().toISOString();
    const record = {
      email: parsedInput.email,
      firstName: parsedInput.firstName,
      lastName: parsedInput.lastName,
      status: "active" as const,
      createdAt: now,
      updatedAt: now
    };

    const created = await this.repository().insertOne(record);
    return this.parseUserRecord(created);
  }

  async findById(id: string): Promise<UserRecord | null> {
    const found = await this.repository().findOne({
      filter: { id },
      parse: (value: unknown) => this.parseUserRecord(value)
    });
    return found;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const found = await this.repository().findOne({
      filter: { email: normalizedEmail },
      parse: (value: unknown) => this.parseUserRecord(value)
    });
    return found;
  }

  async list(options?: { limit?: number; offset?: number }): Promise<readonly UserRecord[]> {
    const users = await this.repository().findMany({
      limit: options?.limit,
      offset: options?.offset,
      sort: { createdAt: "desc" },
      parse: (value: unknown) => this.parseUserRecord(value)
    });
    return users;
  }

  async updateStatus(id: string, input: UpdateUserStatusInput): Promise<UserRecord | null> {
    const parsedInput = UpdateUserStatusInputSchema.parse(input);
    const updated = await this.repository().updateOne(
      { filter: { id } },
      {
        status: parsedInput.status,
        updatedAt: new Date().toISOString()
      }
    );

    if (!updated) return null;
    return this.parseUserRecord(updated);
  }

  async updateProfile(id: string, input: UpdateUserProfileInput): Promise<UserRecord | null> {
    const parsedInput = UpdateUserProfileInputSchema.parse(input);
    const changes: {
      firstName: string;
      lastName: string;
      status?: UpdateUserProfileInput["status"];
      updatedAt: string;
    } = {
      firstName: parsedInput.firstName,
      lastName: parsedInput.lastName,
      updatedAt: new Date().toISOString()
    };
    if (parsedInput.status) {
      changes.status = parsedInput.status;
    }

    const updated = await this.repository().updateOne({ filter: { id: id.trim() } }, changes);

    if (!updated) return null;
    return this.parseUserRecord(updated);
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<UserRecord>(USERS_ENTITY_NAME);
  }

  private parseUserRecord(value: unknown): UserRecord {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return UserRecordSchema.parse(value);
    }

    const normalized = { ...(value as Record<string, unknown>) };
    // Internal embedded assignments must not leak into API UserRecord shape.
    if ("roleAssignments" in normalized) {
      delete normalized.roleAssignments;
    }
    if ("displayName" in normalized) {
      delete normalized.displayName;
    }

    return UserRecordSchema.parse(normalized);
  }
}
