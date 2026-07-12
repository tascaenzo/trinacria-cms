import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import {
  LocalCredentialRecordSchema,
  type LocalCredentialRecord
} from "../installation.schemas.js";

const LOCAL_CREDENTIALS_ENTITY_NAME = "local_credentials";

export interface UpsertLocalCredentialInput {
  userId: string;
  algorithm: "scrypt-v1";
  passwordHash: string;
  passwordSalt: string;
}

/**
 * Persistence adapter for local password credentials.
 */
export class LocalCredentialsRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async findByUserId(userId: string): Promise<LocalCredentialRecord | null> {
    return this.repository().findOne({
      filter: { userId: userId.trim() },
      parse: (value: unknown) => LocalCredentialRecordSchema.parse(value)
    });
  }

  async upsert(input: UpsertLocalCredentialInput): Promise<LocalCredentialRecord> {
    const normalizedUserId = input.userId.trim();
    const existing = await this.findByUserId(normalizedUserId);
    const now = new Date().toISOString();

    if (!existing) {
      const created = await this.repository().insertOne({
        userId: normalizedUserId,
        algorithm: input.algorithm,
        passwordHash: input.passwordHash,
        passwordSalt: input.passwordSalt,
        passwordUpdatedAt: now,
        createdAt: now,
        updatedAt: now
      });
      return LocalCredentialRecordSchema.parse(created);
    }

    const updated = await this.repository().updateOne(
      { filter: { id: existing.id } },
      {
        algorithm: input.algorithm,
        passwordHash: input.passwordHash,
        passwordSalt: input.passwordSalt,
        passwordUpdatedAt: now,
        updatedAt: now
      }
    );
    if (!updated) {
      throw new Error(`Local credentials for user "${normalizedUserId}" disappeared`);
    }
    return LocalCredentialRecordSchema.parse(updated);
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<LocalCredentialRecord>(LOCAL_CREDENTIALS_ENTITY_NAME);
  }
}
