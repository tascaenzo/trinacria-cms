import type { DbAdapter } from "@trinacria-cms/kernel";
import { createPluginDbScope, type PluginDbScope } from "@trinacria-cms/kernel/runtime";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import { type UserRecord, UserRecordSchema } from "../../users/users.schemas.js";

const USERS_ENTITY_NAME = "users";

/**
 * Read-only users projection for authentication flows.
 * It is intentionally local to auth module to avoid module dependency cycles.
 */
export class AuthUsersRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async create(input: {
    email: string;
    firstName: string;
    lastName: string;
    status: "active" | "suspended";
  }): Promise<UserRecord> {
    const now = new Date().toISOString();
    const created = await this.repository().insertOne({
      email: input.email.trim().toLowerCase(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      status: input.status,
      createdAt: now,
      updatedAt: now
    });
    return this.parseUserRecord(created);
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.repository().findOne({
      filter: { id: id.trim() },
      parse: (value: unknown) => this.parseUserRecord(value)
    });
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.repository().findOne({
      filter: { email: email.trim().toLowerCase() },
      parse: (value: unknown) => this.parseUserRecord(value)
    });
  }

  async updateProfile(
    id: string,
    input: { firstName: string; lastName: string; locale?: "en" | "it" }
  ): Promise<UserRecord | null> {
    const updated = await this.repository().updateOne(
      { filter: { id: id.trim() } },
      {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        ...(input.locale ? { locale: input.locale } : {}),
        updatedAt: new Date().toISOString()
      }
    );

    return updated ? this.parseUserRecord(updated) : null;
  }

  async updateStatus(id: string, status: "active" | "suspended"): Promise<UserRecord | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updated = await this.repository().updateOne(
      { filter: { id: id.trim() } },
      {
        status,
        ...(existing.status !== status
          ? { sessionVersion: (existing.sessionVersion ?? 0) + 1 }
          : {}),
        updatedAt: new Date().toISOString()
      }
    );
    return updated ? this.parseUserRecord(updated) : null;
  }

  async revokeSessions(id: string): Promise<UserRecord | null> {
    const user = await this.findById(id);
    if (!user) return null;
    const updated = await this.repository().updateOne(
      { filter: { id, updatedAt: user.updatedAt } },
      {
        sessionVersion: (user.sessionVersion ?? 0) + 1,
        updatedAt: new Date(Math.max(Date.now(), Date.parse(user.updatedAt) + 1)).toISOString()
      }
    );
    if (!updated) throw new Error("User changed while revoking sessions");
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
    // Internal embedded assignments are not part of UserRecord.
    if ("roleAssignments" in normalized) {
      delete normalized.roleAssignments;
    }
    if ("displayName" in normalized) {
      delete normalized.displayName;
    }

    return UserRecordSchema.parse(normalized);
  }
}
