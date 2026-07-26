import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import {
  type AuthMfaChallengePurpose,
  type AuthMfaChallengeRecord,
  AuthMfaChallengeRecordSchema,
  type AuthMfaCredentialRecord,
  AuthMfaCredentialRecordSchema
} from "../auth-mfa.schemas.js";

export class AuthMfaRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async findCredential(userId: string): Promise<AuthMfaCredentialRecord | null> {
    return this.credentials().findOne({
      filter: { userId: userId.trim() },
      parse: (value: unknown) => AuthMfaCredentialRecordSchema.parse(value)
    });
  }

  async savePendingEnrollment(
    userId: string,
    pendingSecretEncrypted: string,
    pendingExpiresAt: string
  ): Promise<AuthMfaCredentialRecord> {
    const existing = await this.findCredential(userId);
    const now = new Date().toISOString();
    if (!existing) {
      return AuthMfaCredentialRecordSchema.parse(
        await this.credentials().insertOne({
          userId: userId.trim(),
          pendingSecretEncrypted,
          pendingExpiresAt,
          createdAt: now,
          updatedAt: now
        })
      );
    }
    const updated = await this.credentials().updateOne(
      { filter: { id: existing.id } },
      { pendingSecretEncrypted, pendingExpiresAt, updatedAt: now }
    );
    if (!updated) throw new Error("MFA credential disappeared while preparing enrollment");
    return AuthMfaCredentialRecordSchema.parse(updated);
  }

  async enable(
    credentialId: string,
    secretEncrypted: string,
    recoveryCodeHashes: readonly string[]
  ): Promise<AuthMfaCredentialRecord> {
    const now = new Date().toISOString();
    const updated = await this.credentials().updateOne(
      { filter: { id: credentialId } },
      {
        secretEncrypted,
        recoveryCodeHashes: [...recoveryCodeHashes],
        enabledAt: now,
        pendingSecretEncrypted: undefined,
        pendingExpiresAt: undefined,
        updatedAt: now
      }
    );
    if (!updated) throw new Error("MFA credential disappeared while confirming enrollment");
    return AuthMfaCredentialRecordSchema.parse(updated);
  }

  async consumeRecoveryCode(
    credential: AuthMfaCredentialRecord,
    matchedHash: string
  ): Promise<boolean> {
    const remaining = (credential.recoveryCodeHashes ?? []).filter((hash) => hash !== matchedHash);
    const updated = await this.credentials().updateOne(
      { filter: { id: credential.id, recoveryCodeHashes: credential.recoveryCodeHashes ?? [] } },
      { recoveryCodeHashes: remaining, updatedAt: new Date().toISOString() }
    );
    return Boolean(updated);
  }

  async disable(userId: string): Promise<boolean> {
    return this.credentials().deleteOne({ filter: { userId: userId.trim() } });
  }

  async createChallenge(input: {
    userId: string;
    tokenHash: string;
    purpose: AuthMfaChallengePurpose;
    expiresAt: string;
  }): Promise<AuthMfaChallengeRecord> {
    const now = new Date().toISOString();
    return AuthMfaChallengeRecordSchema.parse(
      await this.challenges().insertOne({ ...input, createdAt: now, updatedAt: now })
    );
  }

  async findChallenge(tokenHash: string): Promise<AuthMfaChallengeRecord | null> {
    return this.challenges().findOne({
      filter: { tokenHash },
      parse: (value: unknown) => AuthMfaChallengeRecordSchema.parse(value)
    });
  }

  async consumeChallenge(id: string): Promise<boolean> {
    return this.challenges().deleteOne({ filter: { id } });
  }

  private credentials() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<AuthMfaCredentialRecord>("auth_mfa_credentials");
  }

  private challenges() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<AuthMfaChallengeRecord>("auth_mfa_challenges");
  }
}
