import {
  createPluginDbScope,
  type DbAdapter,
  type PluginDbScope,
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import {
  EmbeddedUserRoleSchema,
  UserRoleRecordSchema,
  type UserRoleRecord,
} from "./user-roles.schemas.js";

const USERS_ENTITY_NAME = "users";

interface UserDocument {
  id: string;
  roleAssignments: Array<{
    roleCode: string;
    sourcePluginId: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

/**
 * Persistence adapter for user-role assignments backed by embedded arrays in `users`.
 * No separate join collection is used.
 */
export class UserRolesRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async upsert(input: {
    userId: string;
    roleCode: string;
    sourcePluginId: string;
  }): Promise<UserRoleRecord> {
    const normalizedUserId = input.userId.trim();
    const normalizedRoleCode = input.roleCode.trim().toLowerCase();
    const normalizedSourcePluginId = input.sourcePluginId.trim().toLowerCase();

    const user = await this.findUserById(normalizedUserId);
    if (!user) {
      throw new Error(`User "${normalizedUserId}" not found`);
    }

    const existing = this.toRecords(user).find(
      (record) => record.roleCode === normalizedRoleCode,
    );
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const assignment = EmbeddedUserRoleSchema.parse({
      roleCode: normalizedRoleCode,
      sourcePluginId: normalizedSourcePluginId,
      createdAt: now,
      updatedAt: now,
    });
    const nextAssignments = [...user.roleAssignments, assignment];
    await this.repository().updateOne(
      { filter: { id: user.id } },
      {
        roleAssignments: nextAssignments,
        updatedAt: now,
      },
    );

    return this.toRecord(user.id, assignment);
  }

  async findOne(userId: string, roleCode: string): Promise<UserRoleRecord | null> {
    const normalizedUserId = userId.trim();
    const normalizedRoleCode = roleCode.trim().toLowerCase();
    const records = await this.listByUserId(normalizedUserId);
    return records.find((record) => record.roleCode === normalizedRoleCode) ?? null;
  }

  async listByUserId(userId: string): Promise<readonly UserRoleRecord[]> {
    const user = await this.findUserById(userId.trim());
    if (!user) return [];
    return this.toRecords(user);
  }

  async deleteByUserAndRole(userId: string, roleCode: string): Promise<boolean> {
    const normalizedUserId = userId.trim();
    const normalizedRoleCode = roleCode.trim().toLowerCase();
    const user = await this.findUserById(normalizedUserId);
    if (!user) return false;

    const nextAssignments = user.roleAssignments.filter(
      (assignment) => assignment.roleCode !== normalizedRoleCode,
    );
    if (nextAssignments.length === user.roleAssignments.length) return false;

    await this.repository().updateOne(
      { filter: { id: user.id } },
      {
        roleAssignments: nextAssignments,
        updatedAt: new Date().toISOString(),
      },
    );
    return true;
  }

  async listBySourcePlugin(
    sourcePluginId: string,
  ): Promise<readonly UserRoleRecord[]> {
    const normalizedSource = sourcePluginId.trim().toLowerCase();
    const users = await this.listAllUsers();
    return users.flatMap((user) =>
      user.roleAssignments
        .filter((assignment) => assignment.sourcePluginId === normalizedSource)
        .map((assignment) => this.toRecord(user.id, assignment)),
    );
  }

  async deleteBySourcePlugin(sourcePluginId: string): Promise<number> {
    const normalizedSource = sourcePluginId.trim().toLowerCase();
    const users = await this.listAllUsers();
    let removed = 0;

    for (const user of users) {
      const filtered = user.roleAssignments.filter(
        (assignment) => assignment.sourcePluginId !== normalizedSource,
      );
      if (filtered.length === user.roleAssignments.length) continue;
      removed += user.roleAssignments.length - filtered.length;
      await this.repository().updateOne(
        { filter: { id: user.id } },
        {
          roleAssignments: filtered,
          updatedAt: new Date().toISOString(),
        },
      );
    }
    return removed;
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<Record<string, unknown>>(USERS_ENTITY_NAME);
  }

  private async findUserById(userId: string): Promise<UserDocument | null> {
    const raw = await this.repository().findOne({ filter: { id: userId } });
    if (!raw) return null;
    return this.parseUserDocument(raw);
  }

  private async listAllUsers(): Promise<readonly UserDocument[]> {
    const rawUsers = await this.repository().findMany({});
    return rawUsers.map((item) => this.parseUserDocument(item));
  }

  private parseUserDocument(value: unknown): UserDocument {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Invalid user document shape");
    }

    const record = value as Record<string, unknown>;
    const id = String(record.id ?? "").trim();
    if (!id) {
      throw new Error("Invalid user document: missing id");
    }

    const roleAssignmentsRaw = Array.isArray(record.roleAssignments)
      ? record.roleAssignments
      : [];
    const roleAssignments = roleAssignmentsRaw.map((item) =>
      EmbeddedUserRoleSchema.parse(item),
    );

    return { id, roleAssignments };
  }

  private toRecords(user: UserDocument): readonly UserRoleRecord[] {
    return user.roleAssignments.map((assignment) => this.toRecord(user.id, assignment));
  }

  private toRecord(
    userId: string,
    assignment: UserDocument["roleAssignments"][number],
  ): UserRoleRecord {
    return UserRoleRecordSchema.parse({
      id: this.buildAssignmentId(userId, assignment.roleCode),
      userId,
      roleCode: assignment.roleCode,
      sourcePluginId: assignment.sourcePluginId,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    });
  }

  private buildAssignmentId(userId: string, roleCode: string): string {
    return `${encodeURIComponent(userId)}::${encodeURIComponent(roleCode)}`;
  }
}
