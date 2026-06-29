import { createHash, randomBytes } from "node:crypto";
import type { EventBus } from "@trinacria/events";
import type { SecureEventPayloadStore } from "@trinacria-cms/kernel/contracts";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import type { RuntimeConfigService } from "../../settings/config/runtime-config.service.js";
import { PasswordHashingService } from "../../installation/password-hashing.service.js";
import { LocalCredentialsRepository } from "../../installation/local-credentials.repository.js";
import type { AuthUsersRepository } from "../repositories/auth-users.repository.js";
import { AuthFlowTokensRepository } from "../repositories/auth-flow-tokens.repository.js";
import type { AuthFlowTokenType } from "../auth-flow-tokens.schemas.js";
import { UserLifecycleEventPublisher } from "../../users/services/user-lifecycle-event-publisher.js";

const EMAIL_REQUEST_PAYLOAD_TYPE = "email-pack:send-email-request";
const EMAIL_REQUEST_SCHEMA_VERSION = 1;
const EMAIL_SEND_PERMISSION = "email-pack:email:send";
const EMAIL_READY_EVENT = "core-pack:secure-event-payload-ready";

export class AuthUserFlowsService {
  private readonly userEvents: UserLifecycleEventPublisher;

  constructor(
    private readonly users: AuthUsersRepository,
    private readonly localCredentials: LocalCredentialsRepository,
    private readonly passwordHashing: PasswordHashingService,
    private readonly tokens: AuthFlowTokensRepository,
    private readonly config: RuntimeConfigService,
    private readonly securePayloads: SecureEventPayloadStore,
    private readonly events: EventBus
  ) {
    this.userEvents = new UserLifecycleEventPublisher(events);
  }

  async requestPasswordReset(email: string): Promise<{ accepted: true }> {
    if (!(await this.getBoolean("core-pack:user_flows:password_reset_enabled", true))) {
      return { accepted: true };
    }
    const user = await this.users.findByEmail(email);
    if (!user || user.status !== "active") {
      return { accepted: true };
    }
    const ttl = await this.getNumber("core-pack:user_flows:password_reset_token_ttl_minutes", 60);
    const token = await this.createFlowToken("password_reset", user.email, ttl, user.id);
    const site = await this.getSiteContext();
    await this.sendTemplatedEmail({
      to: user.email,
      templateKey: "reset_password",
      variables: {
        recipientName: `${user.firstName} ${user.lastName}`.trim(),
        siteName: site.name,
        resetUrl: `${site.url}/reset-password?token=${encodeURIComponent(token.plaintext)}`,
        expiresAt: token.expiresAt
      },
      expiresAt: token.expiresAt
    });
    return { accepted: true };
  }

  async completePasswordReset(input: {
    token: string;
    newPassword: string;
  }): Promise<{ completed: true }> {
    const record = await this.consumeFlowToken(input.token, "password_reset");
    if (!record.userId) {
      throw new Error("Invalid password reset token");
    }
    const password = await this.passwordHashing.hashPassword(input.newPassword);
    await this.localCredentials.upsert({
      userId: record.userId,
      algorithm: password.algorithm,
      passwordHash: password.passwordHash,
      passwordSalt: password.passwordSalt
    });
    return { completed: true };
  }

  async requestEmailVerification(email: string): Promise<{ accepted: true }> {
    if (!(await this.getBoolean("core-pack:user_flows:email_verification_required", false))) {
      return { accepted: true };
    }
    const user = await this.users.findByEmail(email);
    if (!user) return { accepted: true };
    const ttl = await this.getNumber(
      "core-pack:user_flows:email_verification_token_ttl_minutes",
      60 * 24
    );
    const token = await this.createFlowToken("email_verification", user.email, ttl, user.id);
    const site = await this.getSiteContext();
    await this.sendTemplatedEmail({
      to: user.email,
      templateKey: "email_verification",
      variables: {
        recipientName: `${user.firstName} ${user.lastName}`.trim(),
        siteName: site.name,
        verificationUrl: `${site.url}/verify-email?token=${encodeURIComponent(token.plaintext)}`,
        expiresAt: token.expiresAt
      },
      expiresAt: token.expiresAt
    });
    return { accepted: true };
  }

  async confirmEmailVerification(token: string): Promise<{ completed: true }> {
    const record = await this.consumeFlowToken(token, "email_verification");
    if (record.userId) {
      const existing = await this.users.findById(record.userId);
      const updated = await this.users.updateStatus(record.userId, "active");
      if (existing && updated && existing.status !== updated.status) {
        await this.userEvents.userStatusChanged({
          userId: updated.id,
          previousStatus: existing.status,
          status: updated.status,
          reason: "email-verification"
        });
      }
    }
    return { completed: true };
  }

  async registerPublic(input: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }): Promise<{ accepted: true }> {
    if (!(await this.getBoolean("core-pack:user_flows:public_registration_enabled", false))) {
      throw new Error("Public registration is disabled");
    }
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new Error(`User with email "${input.email}" already exists`);
    }
    const requiresVerification = await this.getBoolean(
      "core-pack:user_flows:email_verification_required",
      false
    );
    const user = await this.users.create({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      status: requiresVerification ? "suspended" : "active"
    });
    await this.userEvents.userCreated({
      userId: user.id,
      status: user.status,
      source: "public-registration"
    });
    const password = await this.passwordHashing.hashPassword(input.password);
    await this.localCredentials.upsert({
      userId: user.id,
      algorithm: password.algorithm,
      passwordHash: password.passwordHash,
      passwordSalt: password.passwordSalt
    });
    if (requiresVerification) {
      await this.requestEmailVerification(user.email);
    }
    return { accepted: true };
  }

  async sendUserInvite(input: {
    userId: string;
    inviterName?: string;
    actorUserId?: string;
  }): Promise<{ accepted: true }> {
    if (!(await this.getBoolean("core-pack:user_flows:user_invites_enabled", true))) {
      throw new Error("User invites are disabled");
    }
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new Error(`User "${input.userId}" not found`);
    }
    const ttl = await this.getNumber(
      "core-pack:user_flows:user_invite_token_ttl_minutes",
      60 * 24 * 7
    );
    const token = await this.createFlowToken("user_invite", user.email, ttl, user.id);
    const site = await this.getSiteContext();
    await this.sendTemplatedEmail({
      to: user.email,
      templateKey: "user_invite",
      variables: {
        recipientName: `${user.firstName} ${user.lastName}`.trim(),
        siteName: site.name,
        inviterName: input.inviterName?.trim() || "Administrator",
        inviteUrl: `${site.url}/accept-invite?token=${encodeURIComponent(token.plaintext)}`,
        expiresAt: token.expiresAt
      },
      expiresAt: token.expiresAt
    });
    await this.userEvents.userInvited({
      userId: user.id,
      ...(input.actorUserId ? { actorUserId: input.actorUserId } : {})
    });
    return { accepted: true };
  }

  async acceptUserInvite(input: { token: string; password: string }): Promise<{ completed: true }> {
    const record = await this.consumeFlowToken(input.token, "user_invite");
    if (!record.userId) {
      throw new Error("Invalid invite token");
    }
    const password = await this.passwordHashing.hashPassword(input.password);
    await this.localCredentials.upsert({
      userId: record.userId,
      algorithm: password.algorithm,
      passwordHash: password.passwordHash,
      passwordSalt: password.passwordSalt
    });
    const existing = await this.users.findById(record.userId);
    const updated = await this.users.updateStatus(record.userId, "active");
    if (updated) {
      await this.userEvents.userInviteAccepted({
        userId: updated.id
      });
      if (existing && existing.status !== updated.status) {
        await this.userEvents.userStatusChanged({
          userId: updated.id,
          previousStatus: existing.status,
          status: updated.status,
          reason: "invite-accepted"
        });
      }
    }
    return { completed: true };
  }

  private async createFlowToken(
    tokenType: AuthFlowTokenType,
    email: string,
    ttlMinutes: number,
    userId?: string
  ): Promise<{ plaintext: string; expiresAt: string }> {
    const plaintext = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
    await this.tokens.create({
      tokenType,
      tokenHash: hashToken(plaintext),
      email,
      ...(userId ? { userId } : {}),
      expiresAt
    });
    return { plaintext, expiresAt };
  }

  private async consumeFlowToken(
    plaintext: string,
    tokenType: AuthFlowTokenType
  ): Promise<{ userId?: string }> {
    const record = await this.tokens.findAvailableByHash(hashToken(plaintext), tokenType);
    if (!record) {
      throw new Error("Invalid or expired token");
    }
    if (Date.parse(record.expiresAt) <= Date.now()) {
      await this.tokens.expire(record.id);
      throw new Error("Invalid or expired token");
    }
    await this.tokens.consume(record.id);
    return { userId: record.userId };
  }

  private async sendTemplatedEmail(input: {
    to: string;
    templateKey: string;
    variables: Record<string, string>;
    expiresAt: string;
  }): Promise<void> {
    const record = await this.securePayloads.create({
      producerPluginId: CORE_PACK_PLUGIN_ID,
      eventName: EMAIL_READY_EVENT,
      payloadType: EMAIL_REQUEST_PAYLOAD_TYPE,
      schemaVersion: EMAIL_REQUEST_SCHEMA_VERSION,
      requiredPermission: EMAIL_SEND_PERMISSION,
      payload: {
        to: input.to,
        templateKey: input.templateKey,
        locale: await this.getString("core-pack:user_flows:notification_locale", "it"),
        variables: input.variables
      },
      expiresAt: input.expiresAt,
      maxClaims: 1,
      authorizedConsumerPluginIds: ["email-pack"]
    });
    await this.events.emit(EMAIL_READY_EVENT, {
      securePayloadId: record.id,
      payloadType: record.payloadType,
      schemaVersion: record.schemaVersion
    });
  }

  private async getSiteContext(): Promise<{ name: string; url: string }> {
    return {
      name: await this.getString("core-pack:site:name", "Trinacria CMS"),
      url: (await this.getString("core-pack:site:url", "http://localhost:3000")).replace(/\/+$/, "")
    };
  }

  private async getString(key: string, fallback: string): Promise<string> {
    return (await this.config.getString(key, { fallback })) ?? fallback;
  }

  private async getNumber(key: string, fallback: number): Promise<number> {
    return (await this.config.getNumber(key, { fallback, min: 1 })) ?? fallback;
  }

  private async getBoolean(key: string, fallback: boolean): Promise<boolean> {
    return (await this.config.getBoolean(key, { fallback })) ?? fallback;
  }
}

function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
