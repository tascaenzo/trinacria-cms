import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { UserRecord } from "../users/users.schemas.js";
import {
  type InstallationStateRecord,
} from "../installation/installation.schemas.js";
import { InstallationStateRepository } from "../installation/installation-state.repository.js";
import { LocalCredentialsRepository } from "../installation/local-credentials.repository.js";
import { PasswordHashingService } from "../installation/password-hashing.service.js";
import { AuthUsersRepository } from "./auth-users.repository.js";

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
 */
export class JwtAuthService {
  private readonly jwtSecret: string;
  private readonly jwtKey: Uint8Array;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;

  constructor(
    private readonly users: AuthUsersRepository,
    private readonly localCredentials: LocalCredentialsRepository,
    private readonly installationState: InstallationStateRepository,
    private readonly passwordHashing: PasswordHashingService,
  ) {
    this.jwtSecret = readJwtSecretFromEnv();
    this.jwtKey = createJwtKey(this.jwtSecret);
    this.accessTtlSeconds = readAccessTtlSecondsFromEnv();
    this.refreshTtlSeconds = readRefreshTtlSecondsFromEnv();
  }

  async loginWithPassword(input: {
    email: string;
    password: string;
  }): Promise<LoginResult> {
    const installation = await this.assertInstallationCompleted();

    const user = await this.users.findByEmail(input.email);
    if (!user || user.status !== "active") {
      throw new JwtAuthError("auth_invalid_credentials", "Invalid credentials");
    }

    const credentials = await this.localCredentials.findByUserId(user.id);
    if (!credentials) {
      throw new JwtAuthError("auth_invalid_credentials", "Invalid credentials");
    }

    const matches = await this.passwordHashing.verifyPassword(input.password, {
      algorithm: credentials.algorithm,
      passwordHash: credentials.passwordHash,
      passwordSalt: credentials.passwordSalt,
    });
    if (!matches) {
      throw new JwtAuthError("auth_invalid_credentials", "Invalid credentials");
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const accessExp = nowSeconds + this.accessTtlSeconds;
    const refreshExp = nowSeconds + this.refreshTtlSeconds;
    const accessToken = await createJwtToken(
      {
        kind: "access",
        sub: user.id,
        pluginId: "core-pack",
        isAdmin: Boolean(installation.adminUserId && installation.adminUserId === user.id),
        iat: nowSeconds,
        exp: accessExp,
      },
      this.jwtKey,
    );
    const refreshToken = await createJwtToken(
      {
        kind: "refresh",
        sub: user.id,
        pluginId: "core-pack",
        isAdmin: Boolean(installation.adminUserId && installation.adminUserId === user.id),
        iat: nowSeconds,
        exp: refreshExp,
      },
      this.jwtKey,
    );
    const expiresAt = new Date(accessExp * 1000).toISOString();
    const refreshExpiresAt = new Date(refreshExp * 1000).toISOString();

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresAt,
      refreshExpiresAt,
      user,
    };
  }

  async authenticateBearerToken(
    token: string,
    options?: { requireAdmin?: boolean },
  ): Promise<UserRecord> {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      throw new JwtAuthError("auth_missing_token", "Missing bearer token");
    }

    const claims = await verifyJwtToken(normalizedToken, this.jwtKey);
    if (claims.kind !== "access") {
      throw new JwtAuthError("auth_invalid_token", "Expected an access token");
    }

    const user = await this.users.findById(claims.sub);
    if (!user || user.status !== "active") {
      throw new JwtAuthError("auth_invalid_user", "JWT user is not active");
    }

    if (options?.requireAdmin ?? true) {
      const state = await this.assertInstallationCompleted();
      if (!state.adminUserId || state.adminUserId !== user.id) {
        throw new JwtAuthError(
          "auth_forbidden_admin_required",
          "Administrator privileges are required",
        );
      }
    }

    return user;
  }

  async revokeBearerToken(token: string): Promise<boolean> {
    const normalizedToken = token.trim();
    if (!normalizedToken) return false;
    // Stateless JWT cannot be server-revoked without a denylist store.
    // Current behavior asks clients to discard the token.
    return true;
  }

  async authenticateRefreshToken(token: string): Promise<UserRecord> {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      throw new JwtAuthError("auth_missing_token", "Missing refresh token");
    }

    const claims = await verifyJwtToken(normalizedToken, this.jwtKey);
    if (claims.kind !== "refresh") {
      throw new JwtAuthError("auth_invalid_token", "Expected a refresh token");
    }

    const user = await this.users.findById(claims.sub);
    if (!user || user.status !== "active") {
      throw new JwtAuthError("auth_invalid_user", "JWT user is not active");
    }

    return user;
  }

  private async assertInstallationCompleted(): Promise<InstallationStateRecord> {
    const state = await this.installationState.ensureCreated();
    if (!state.installed) {
      throw new JwtAuthError(
        "installation_not_completed",
        "CMS installation has not been completed",
      );
    }
    return state;
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

function readJwtSecretFromEnv(): string {
  const secret = process.env.CMS_JWT_SECRET?.trim();
  if (secret) return secret;
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

async function createJwtToken(
  claims: JwtClaims,
  secret: Uint8Array,
): Promise<string> {
  return new SignJWT({
    kind: claims.kind,
    pluginId: claims.pluginId,
    isAdmin: claims.isAdmin,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt(claims.iat)
    .setExpirationTime(claims.exp)
    .sign(secret);
}

async function verifyJwtToken(
  token: string,
  secret: Uint8Array,
): Promise<JwtClaims> {
  try {
    const { payload, protectedHeader } = await jwtVerify<JwtClaims>(token, secret, {
      algorithms: ["HS256"],
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
        ? ((error as { code: string }).code)
        : "";
    const message = error instanceof Error ? error.message.toLowerCase() : "";

    if (code.includes("EXPIRED") || message.includes("expired")) {
      throw new JwtAuthError("auth_token_expired", "JWT token is expired");
    }

    throw new JwtAuthError("auth_invalid_token", "Invalid JWT token");
  }
}

function normalizeClaims(payload: Partial<JwtClaims>): JwtClaims {
  const kind = payload.kind === "refresh" ? "refresh" : payload.kind === "access" ? "access" : "";
  const sub = String(payload.sub ?? "").trim();
  const pluginId = String(payload.pluginId ?? "").trim().toLowerCase();
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
    exp,
  };
}
