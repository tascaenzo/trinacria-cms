import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import {
  AuthFlowTokenRecordSchema,
  type AuthFlowTokenRecord,
  type AuthFlowTokenType
} from "../auth-flow-tokens.schemas.js";

const AUTH_FLOW_TOKENS_ENTITY_NAME = "auth_flow_tokens";

export class AuthFlowTokensRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async create(input: {
    tokenType: AuthFlowTokenType;
    tokenHash: string;
    email: string;
    userId?: string;
    expiresAt: string;
  }): Promise<AuthFlowTokenRecord> {
    const now = new Date().toISOString();
    const created = await this.repository().insertOne({
      tokenType: input.tokenType,
      tokenHash: input.tokenHash,
      email: input.email.trim().toLowerCase(),
      ...(input.userId ? { userId: input.userId.trim() } : {}),
      status: "available",
      expiresAt: input.expiresAt,
      createdAt: now,
      updatedAt: now
    });
    return AuthFlowTokenRecordSchema.parse(created);
  }

  async findAvailableByHash(
    tokenHash: string,
    tokenType: AuthFlowTokenType
  ): Promise<AuthFlowTokenRecord | null> {
    return this.repository().findOne({
      filter: { tokenHash, tokenType, status: "available" },
      parse: (value: unknown) => AuthFlowTokenRecordSchema.parse(value)
    });
  }

  async consume(id: string): Promise<AuthFlowTokenRecord | null> {
    const now = new Date().toISOString();
    const updated = await this.repository().updateOne(
      { filter: { id: id.trim() } },
      { status: "consumed", consumedAt: now, updatedAt: now }
    );
    return updated ? AuthFlowTokenRecordSchema.parse(updated) : null;
  }

  async expire(id: string): Promise<AuthFlowTokenRecord | null> {
    const updated = await this.repository().updateOne(
      { filter: { id: id.trim() } },
      { status: "expired", updatedAt: new Date().toISOString() }
    );
    return updated ? AuthFlowTokenRecordSchema.parse(updated) : null;
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<AuthFlowTokenRecord>(AUTH_FLOW_TOKENS_ENTITY_NAME);
  }
}
