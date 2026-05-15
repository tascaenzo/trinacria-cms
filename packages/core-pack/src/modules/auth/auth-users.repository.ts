import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import { UserRecordSchema, type UserRecord } from "../users/users.schemas.js";

const USERS_ENTITY_NAME = "users";

/**
 * Read-only users projection for authentication flows.
 * It is intentionally local to auth module to avoid module dependency cycles.
 */
export class AuthUsersRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

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

    const displayName =
      typeof normalized.displayName === "string" ? normalized.displayName.trim() : "";
    if (!displayName) {
      const firstName = typeof normalized.firstName === "string" ? normalized.firstName.trim() : "";
      const lastName = typeof normalized.lastName === "string" ? normalized.lastName.trim() : "";
      normalized.displayName = `${firstName} ${lastName}`.trim() || "Unknown User";
    }

    if ("firstName" in normalized) {
      delete normalized.firstName;
    }
    if ("lastName" in normalized) {
      delete normalized.lastName;
    }

    return UserRecordSchema.parse(normalized);
  }
}
