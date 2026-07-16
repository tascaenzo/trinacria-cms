import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual
} from "node:crypto";
import type { UserRecord } from "../../users/users.schemas.js";
import type { AuthMfaChallengePurpose } from "../auth-mfa.schemas.js";
import type { AuthMfaRepository } from "../repositories/auth-mfa.repository.js";
import { JwtAuthError } from "./auth.service.js";

const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const ENROLLMENT_TTL_MS = 10 * 60 * 1000;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const RECOVERY_CODE_COUNT = 8;

export class AuthMfaService {
  constructor(private readonly repository: AuthMfaRepository) {}

  async hasEnabledFactor(userId: string): Promise<boolean> {
    const credential = await this.repository.findCredential(userId);
    return Boolean(credential?.secretEncrypted && credential.enabledAt);
  }

  async getStatus(userId: string, mode: MfaMode): Promise<{
    mode: MfaMode;
    enabled: boolean;
    enabledAt?: string;
    recoveryCodesRemaining: number;
  }> {
    const credential = await this.repository.findCredential(userId);
    const enabled = Boolean(credential?.secretEncrypted && credential.enabledAt);
    return {
      mode,
      enabled,
      ...(enabled && credential?.enabledAt ? { enabledAt: credential.enabledAt } : {}),
      recoveryCodesRemaining: enabled ? (credential?.recoveryCodeHashes?.length ?? 0) : 0
    };
  }

  async beginEnrollment(user: UserRecord): Promise<EnrollmentSetup> {
    const secret = generateBase32Secret();
    const expiresAt = new Date(Date.now() + ENROLLMENT_TTL_MS).toISOString();
    await this.repository.savePendingEnrollment(user.id, encryptSecret(secret), expiresAt);
    return {
      manualKey: secret,
      otpauthUrl: buildOtpAuthUrl(user.email, secret),
      expiresAt
    };
  }

  async confirmEnrollment(userId: string, code: string): Promise<{ recoveryCodes: readonly string[] }> {
    const credential = await this.repository.findCredential(userId);
    if (!credential?.pendingSecretEncrypted || !credential.pendingExpiresAt) {
      throw new JwtAuthError("auth_mfa_enrollment_missing", "No MFA enrollment is in progress");
    }
    if (new Date(credential.pendingExpiresAt).getTime() <= Date.now()) {
      throw new JwtAuthError("auth_mfa_enrollment_expired", "MFA enrollment has expired");
    }

    const secret = decryptSecret(credential.pendingSecretEncrypted);
    if (!verifyTotp(secret, code)) {
      throw new JwtAuthError("auth_mfa_invalid_code", "Invalid authenticator code");
    }

    const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);
    await this.repository.enable(
      credential.id,
      encryptSecret(secret),
      recoveryCodes.map(hashRecoveryCode)
    );
    return { recoveryCodes };
  }

  async verifyCode(userId: string, code: string): Promise<boolean> {
    const credential = await this.repository.findCredential(userId);
    if (!credential?.secretEncrypted || !credential.enabledAt) return false;
    const normalizedCode = normalizeCode(code);
    if (verifyTotp(decryptSecret(credential.secretEncrypted), normalizedCode)) return true;

    for (const hash of credential.recoveryCodeHashes ?? []) {
      if (safeEquals(hash, hashRecoveryCode(normalizedCode))) {
        return this.repository.consumeRecoveryCode(credential, hash);
      }
    }
    return false;
  }

  async disable(userId: string): Promise<void> {
    await this.repository.disable(userId);
  }

  async createChallenge(userId: string, purpose: AuthMfaChallengePurpose): Promise<MfaChallenge> {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
    await this.repository.createChallenge({
      userId,
      purpose,
      tokenHash: hashChallenge(token),
      expiresAt
    });
    return { challengeId: token, purpose, expiresAt };
  }

  async resolveChallenge(
    challengeId: string,
    expectedPurpose: AuthMfaChallengePurpose
  ): Promise<{ id: string; userId: string }> {
    const record = await this.repository.findChallenge(hashChallenge(challengeId));
    if (!record || record.purpose !== expectedPurpose || new Date(record.expiresAt).getTime() <= Date.now()) {
      throw new JwtAuthError("auth_mfa_challenge_invalid", "MFA challenge is invalid or expired");
    }
    return { id: record.id, userId: record.userId };
  }

  async consumeChallenge(id: string): Promise<void> {
    await this.repository.consumeChallenge(id);
  }
}

export type MfaMode = "disabled" | "optional" | "required";
export interface MfaChallenge {
  challengeId: string;
  purpose: AuthMfaChallengePurpose;
  expiresAt: string;
}
export interface EnrollmentSetup {
  manualKey: string;
  otpauthUrl: string;
  expiresAt: string;
}

function generateBase32Secret(): string {
  return toBase32(randomBytes(20));
}

function buildOtpAuthUrl(email: string, secret: string): string {
  const issuer = "Trinacria CMS";
  const label = `${issuer}:${email}`;
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;
}

function encryptSecret(value: string): string {
  const key = readEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptSecret(value: string): string {
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error("Invalid encrypted MFA secret");
  const decipher = createDecipheriv("aes-256-gcm", readEncryptionKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, "base64url")), decipher.final()]).toString("utf8");
}

function readEncryptionKey(): Buffer {
  const configured = process.env.CMS_MFA_ENCRYPTION_KEY?.trim();
  if (configured) {
    const parsed = /^[a-f0-9]{64}$/i.test(configured)
      ? Buffer.from(configured, "hex")
      : Buffer.from(configured, "base64url");
    if (parsed.length === 32) return parsed;
    throw new Error("CMS_MFA_ENCRYPTION_KEY must be a 32-byte base64url or 64-character hex value");
  }
  if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging") {
    throw new Error("CMS_MFA_ENCRYPTION_KEY is required when MFA is enabled in production");
  }
  return createHash("sha256")
    .update(`trinacria-mfa-dev:${process.env.CMS_JWT_SECRET ?? "trinacria-cms-dev-secret-change-me"}`)
    .digest();
}

function verifyTotp(secret: string, code: string): boolean {
  const normalized = normalizeCode(code);
  if (!/^\d{6}$/.test(normalized)) return false;
  const currentStep = Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS);
  return [-1, 0, 1].some((offset) => safeEquals(generateTotp(secret, currentStep + offset), normalized));
}

function generateTotp(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac("sha1", fromBase32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3];
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

function generateRecoveryCode(): string {
  return `${randomBytes(4).toString("hex").slice(0, 4)}-${randomBytes(4).toString("hex").slice(0, 4)}`.toUpperCase();
}

function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(normalizeCode(code)).digest("hex");
}

function hashChallenge(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

function normalizeCode(code: string): string {
  return code.trim().replace(/[\s-]/g, "").toUpperCase();
}

function safeEquals(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function toBase32(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return output + (bits > 0 ? BASE32_ALPHABET[(value << (5 - bits)) & 31] : "");
}

function fromBase32(value: string): Buffer {
  let bits = 0;
  let accumulator = 0;
  const output: number[] = [];
  for (const char of value.replace(/=|\s/g, "").toUpperCase()) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) throw new Error("Invalid base32 MFA secret");
    accumulator = (accumulator << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((accumulator >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}
