import { type DbAdapter } from "@trinacria-cms/kernel";
import { SignJWT, jwtVerify, decodeJwt, type JWTPayload } from "jose";
import type { UserRecord } from "../users/users.schemas.js";
import { type InstallationStateRecord } from "../installation/installation.schemas.js";
import { InstallationStateRepository } from "../installation/installation-state.repository.js";
import { LocalCredentialsRepository } from "../installation/local-credentials.repository.js";
import { PasswordHashingService } from "../installation/password-hashing.service.js";
import { AuthUsersRepository } from "./auth-users.repository.js";
import { AuthBlacklistRepository } from "./auth-blacklist.repository.js";
import { AuthLoginAttemptRepository } from "./auth-login-attempt.repository.js";
import { readCorePackSettingValue } from "../settings/runtime-settings.js";
import { type JwtCookieConfig, readJwtCookieConfig, readJwtCookieConfigFromEnv } from "./auth-session.js";

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresAt: string;
  refreshExpiresAt: string;
  user: UserRecord;
}

/**
 * Typed authentication error used by JWT auth API and middleware.
 */
export class JwtAuthError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "JwtAuthError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Service handling login and JWT validation.
 *
 * Token revocation and brute-force tracking are persisted to MongoDB.
 * Survives restarts and is shared across replicas.
 */
export class JwtAuthService {
  private authSettingsCache?: {
    loadedAtMs: number;
    jwtKey: Uint8Array;
    accessTtlSeconds: number;
    refreshTtlSeconds: number;
    maxLoginAttempts: number;
    loginLockoutMinutes: number;
  };
  private cookieConfigCache?: { loadedAtMs: number; value: JwtCookieConfig };

  constructor(
    private readonly users: AuthUsersRepository,
    private readonly localCredentials: LocalCredentialsRepository,
    private readonly installationState: InstallationStateRepository,
    private readonly passwordHashing: PasswordHashingService,
    private readonly blacklist: AuthBlacklistRepository,
    private readonly loginAttempts: AuthLoginAttemptRepository,
    private readonly db: DbAdapter
  ) {}

  async loginWithPassword(input: { email: string; password: string }): Promise<LoginResult> {
    const authConfig = await this.getAuthConfig();
    const email = input.email.trim().toLowerCase();
    await this.assertNotLockedOut(email, authConfig.loginLockoutMinutes);

    const installation = await this.assertInstallationCompleted();

    const user = await this.users.findByEmail(email);
    if (!user || user.status !== "active") {
      await this.recordFailedAttempt(email, authConfig.maxLoginAttempts, authConfig.loginLockoutMinutes);
      throw new JwtAuthError("auth_invalid_credentials", "Invalid credentials");
    }

    const credentials = await this.localCredentials.findByUserId(user.id);
    if (!credentials) {
      await this.recordFailedAttempt(email, authConfig.maxLoginAttempts, authConfig.loginLockoutMinutes);
      throw new JwtAuthError("auth_invalid_credentials", "Invalid credentials");
    }

    const matches = await this.passwordHashing.verifyPassword(input.password, {
      algorithm: credentials.algorithm,
      passwordHash: credentials.passwordHash,
      passwordSalt: credentials.passwordSalt
    });
    if (!matches) {
      await this.recordFailedAttempt(email, authConfig.maxLoginAttempts, authConfig.loginLockoutMinutes);
      throw new JwtAuthError("auth_invalid_credentials", "Invalid credentials");
    }

    await this.loginAttempts.reset(email);

    const nowSeconds = Math.floor(Date.now() / 1000);
    const accessExp = nowSeconds + authConfig.accessTtlSeconds;
    const refreshExp = nowSeconds + authConfig.refreshTtlSeconds;
    const accessToken = await createJwtToken(
      {
        kind: "access",
        sub: user.id,
        pluginId: "core-pack",
        isAdmin: Boolean(installation.adminUserId && installation.adminUserId === user.id),
        iat: nowSeconds,
        exp: accessExp
      },
      authConfig.jwtKey
    );
    const refreshToken = await createJwtToken(
      {
        kind: "refresh",
        sub: user.id,
        pluginId: "core-pack",
        isAdmin: Boolean(installation.adminUserId && installation.adminUserId === user.id),
        iat: nowSeconds,
        exp: refreshExp
      },
      authConfig.jwtKey
    );
    const expiresAt = new Date(accessExp * 1000).toISOString();
    const refreshExpiresAt = new Date(refreshExp * 1000).toISOString();

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresAt,
      refreshExpiresAt,
      user
    };
  }

  async authenticateBearerToken(
    token: string,
    options?: { requireAdmin?: boolean }
  ): Promise<UserRecord> {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      throw new JwtAuthError("auth_missing_token", "Missing bearer token");
    }

    const authConfig = await this.getAuthConfig();
    const claims = await verifyJwtToken(normalizedToken, authConfig.jwtKey);
    if (claims.kind !== "access") {
      throw new JwtAuthError("auth_invalid_token", "Expected an access token");
    }

    await this.assertTokenNotRevoked(claims.sub, claims.iat);

    const user = await this.users.findById(claims.sub);
    if (!user || user.status !== "active") {
      throw new JwtAuthError("auth_invalid_user", "JWT user is not active");
    }

    if (options?.requireAdmin ?? true) {
      const state = await this.assertInstallationCompleted();
      if (!state.adminUserId || state.adminUserId !== user.id) {
        throw new JwtAuthError(
          "auth_forbidden_admin_required",
          "Administrator privileges are required"
        );
      }
    }

    return user;
  }

  async revokeBearerToken(token: string): Promise<boolean> {
    const normalizedToken = token.trim();
    if (!normalizedToken) return false;

    try {
      const payload = decodeJwt<JwtClaims>(normalizedToken);
      if (payload.sub && payload.iat) {
        const fallbackRefreshTtl = (await this.getAuthConfig()).refreshTtlSeconds;
        const exp = payload.exp ?? payload.iat + fallbackRefreshTtl;
        await this.blacklist.add(
          payload.sub,
          payload.iat,
          payload.kind,
          new Date(exp * 1000).toISOString()
        );
      }
    } catch {
      // Malformed token — nothing to revoke
    }
    return true;
  }

  async authenticateRefreshToken(token: string): Promise<UserRecord> {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      throw new JwtAuthError("auth_missing_token", "Missing refresh token");
    }

    const authConfig = await this.getAuthConfig();
    const claims = await verifyJwtToken(normalizedToken, authConfig.jwtKey);
    if (claims.kind !== "refresh") {
      throw new JwtAuthError("auth_invalid_token", "Expected a refresh token");
    }

    await this.assertTokenNotRevoked(claims.sub, claims.iat);

    const user = await this.users.findById(claims.sub);
    if (!user || user.status !== "active") {
      throw new JwtAuthError("auth_invalid_user", "JWT user is not active");
    }

    return user;
  }

  async getJwtCookieConfig(): Promise<JwtCookieConfig> {
    const nowMs = Date.now();
    if (this.cookieConfigCache && nowMs - this.cookieConfigCache.loadedAtMs < 30_000) {
      return this.cookieConfigCache.value;
    }
    const value = await readJwtCookieConfig(this.db, readJwtCookieConfigFromEnv());
    this.cookieConfigCache = { loadedAtMs: nowMs, value };
    return value;
  }

  private async assertNotLockedOut(email: string, _lockoutMinutes: number): Promise<void> {
    const record = await this.loginAttempts.findByEmail(email);
    if (!record?.lockoutUntil) return;

    const lockMs = new Date(record.lockoutUntil).getTime();
    if (Date.now() < lockMs) {
      const remaining = Math.ceil((lockMs - Date.now()) / 1000);
      throw new JwtAuthError(
        "auth_account_locked",
        `Account temporarily locked. Try again in ${remaining} seconds.`
      );
    }

    await this.loginAttempts.reset(email);
  }

  private async recordFailedAttempt(
    email: string,
    maxAttempts: number,
    lockoutMinutes: number
  ): Promise<void> {
    await this.loginAttempts.increment(email, maxAttempts, lockoutMinutes);
  }

  private async assertTokenNotRevoked(sub: string, iat: number): Promise<void> {
    const blacklisted = await this.blacklist.isBlacklisted(sub, iat);
    if (blacklisted) {
      throw new JwtAuthError("auth_token_revoked", "Token has been revoked");
    }
  }

  private async assertInstallationCompleted(): Promise<InstallationStateRecord> {
    const state = await this.installationState.ensureCreated();
    if (!state.installed) {
      throw new JwtAuthError(
        "installation_not_completed",
        "CMS installation has not been completed"
      );
    }
    return state;
  }

  private async getAuthConfig(): Promise<{
    jwtKey: Uint8Array;
    accessTtlSeconds: number;
    refreshTtlSeconds: number;
    maxLoginAttempts: number;
    loginLockoutMinutes: number;
  }> {
    const nowMs = Date.now();
    if (this.authSettingsCache && nowMs - this.authSettingsCache.loadedAtMs < 30_000) {
      return this.authSettingsCache;
    }

    const accessTtlSeconds = await readIntSetting(
      this.db,
      "core-pack:auth:jwt_access_ttl_seconds",
      readAccessTtlSecondsFromEnv(),
      60
    );
    const refreshTtlSeconds = await readIntSetting(
      this.db,
      "core-pack:auth:jwt_refresh_ttl_seconds",
      readRefreshTtlSecondsFromEnv(),
      300
    );
    const maxLoginAttempts = await readIntSetting(
      this.db,
      "core-pack:auth:login_max_attempts",
      readMaxLoginAttemptsFromEnv(),
      1
    );
    const loginLockoutMinutes = await readIntSetting(
      this.db,
      "core-pack:auth:login_lockout_minutes",
      readLoginLockoutMinutesFromEnv(),
      1
    );
    const strictSecret = await readBooleanSetting(this.db, "core-pack:auth:strict_jwt_secret_required", false);
    const jwtSecret = readJwtSecretFromEnv(strictSecret);
    const value = {
      loadedAtMs: nowMs,
      jwtKey: createJwtKey(jwtSecret),
      accessTtlSeconds,
      refreshTtlSeconds,
      maxLoginAttempts,
      loginLockoutMinutes
    };
    this.authSettingsCache = value;
    return value;
  }
}

function readAccessTtlSecondsFromEnv(): number {
  const raw = process.env.CMS_JWT_ACCESS_TTL_SECONDS?.trim();
  if (!raw) return 24 * 60 * 60;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("CMS_JWT_ACCESS_TTL_SECONDS must be a positive integer");
  }
  return parsed;
}

function readRefreshTtlSecondsFromEnv(): number {
  const raw = process.env.CMS_JWT_REFRESH_TTL_SECONDS?.trim();
  if (!raw) return 30 * 24 * 60 * 60;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("CMS_JWT_REFRESH_TTL_SECONDS must be a positive integer");
  }
  return parsed;
}

function readMaxLoginAttemptsFromEnv(): number {
  const raw = process.env.CMS_LOGIN_MAX_ATTEMPTS?.trim();
  if (!raw) return 5;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("CMS_LOGIN_MAX_ATTEMPTS must be a positive integer");
  }
  return parsed;
}

function readLoginLockoutMinutesFromEnv(): number {
  const raw = process.env.CMS_LOGIN_LOCKOUT_MINUTES?.trim();
  if (!raw) return 15;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("CMS_LOGIN_LOCKOUT_MINUTES must be a positive integer");
  }
  return parsed;
}

function readJwtSecretFromEnv(strictRequired = false): string {
  const secret = process.env.CMS_JWT_SECRET?.trim();
  if (secret) return secret;
  if (strictRequired) {
    throw new Error("CMS_JWT_SECRET is required by strict JWT secret policy");
  }
  // Dev fallback; production apps should define CMS_JWT_SECRET in .env.
  return "trinacria-cms-dev-secret-change-me";
}

interface JwtClaims extends JWTPayload {
  kind: "access" | "refresh";
  sub: string;
  pluginId: string;
  isAdmin: boolean;
  iat: number;
  exp: number;
}

function createJwtKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

async function createJwtToken(claims: JwtClaims, secret: Uint8Array): Promise<string> {
  return new SignJWT({
    kind: claims.kind,
    pluginId: claims.pluginId,
    isAdmin: claims.isAdmin
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt(claims.iat)
    .setExpirationTime(claims.exp)
    .sign(secret);
}

async function verifyJwtToken(token: string, secret: Uint8Array): Promise<JwtClaims> {
  try {
    const { payload, protectedHeader } = await jwtVerify<JwtClaims>(token, secret, {
      algorithms: ["HS256"]
    });

    if (protectedHeader.typ !== "JWT") {
      throw new JwtAuthError("auth_invalid_token", "Unsupported JWT header");
    }

    return normalizeClaims(payload);
  } catch (error) {
    if (error instanceof JwtAuthError) {
      throw error;
    }

    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : "";
    const message = error instanceof Error ? error.message.toLowerCase() : "";

    if (code.includes("EXPIRED") || message.includes("expired")) {
      throw new JwtAuthError("auth_token_expired", "JWT token is expired");
    }

    throw new JwtAuthError("auth_invalid_token", "Invalid JWT token");
  }
}

async function readIntSetting(
  db: DbAdapter,
  key: string,
  fallback: number,
  min: number
): Promise<number> {
  const raw = await readCorePackSettingValue(db, key);
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  const parsed = Math.floor(raw);
  return parsed >= min ? parsed : fallback;
}

async function readBooleanSetting(db: DbAdapter, key: string, fallback: boolean): Promise<boolean> {
  const raw = await readCorePackSettingValue(db, key);
  return typeof raw === "boolean" ? raw : fallback;
}

function normalizeClaims(payload: Partial<JwtClaims>): JwtClaims {
  const kind = payload.kind === "refresh" ? "refresh" : payload.kind === "access" ? "access" : "";
  const sub = String(payload.sub ?? "").trim();
  const pluginId = String(payload.pluginId ?? "")
    .trim()
    .toLowerCase();
  const iat = Number(payload.iat);
  const exp = Number(payload.exp);
  const isAdmin = Boolean(payload.isAdmin);

  if (!kind || !sub || !pluginId || !Number.isFinite(iat) || !Number.isFinite(exp)) {
    throw new JwtAuthError("auth_invalid_token", "Invalid JWT claims");
  }

  return {
    kind,
    sub,
    pluginId,
    isAdmin,
    iat,
    exp
  };
}
