import { createHmac, timingSafeEqual } from "node:crypto";
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
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;

  constructor(
    private readonly users: AuthUsersRepository,
    private readonly localCredentials: LocalCredentialsRepository,
    private readonly installationState: InstallationStateRepository,
    private readonly passwordHashing: PasswordHashingService,
  ) {
    this.jwtSecret = readJwtSecretFromEnv();
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
    const accessToken = createJwtToken(
      {
        kind: "access",
        sub: user.id,
        pluginId: "core-pack",
        isAdmin: Boolean(installation.adminUserId && installation.adminUserId === user.id),
        iat: nowSeconds,
        exp: accessExp,
      },
      this.jwtSecret,
    );
    const refreshToken = createJwtToken(
      {
        kind: "refresh",
        sub: user.id,
        pluginId: "core-pack",
        isAdmin: Boolean(installation.adminUserId && installation.adminUserId === user.id),
        iat: nowSeconds,
        exp: refreshExp,
      },
      this.jwtSecret,
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

    const claims = verifyJwtToken(normalizedToken, this.jwtSecret);
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

    const claims = verifyJwtToken(normalizedToken, this.jwtSecret);
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

interface JwtHeader {
  alg: "HS256";
  typ: "JWT";
}

interface JwtClaims {
  kind: "access" | "refresh";
  sub: string;
  pluginId: string;
  isAdmin: boolean;
  iat: number;
  exp: number;
}

function createJwtToken(claims: JwtClaims, secret: string): string {
  const header: JwtHeader = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = signHmacSha256(unsignedToken, secret);
  return `${unsignedToken}.${signature}`;
}

function verifyJwtToken(token: string, secret: string): JwtClaims {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new JwtAuthError("auth_invalid_token", "Invalid JWT format");
  }

  const [encodedHeader, encodedPayload, receivedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !receivedSignature) {
    throw new JwtAuthError("auth_invalid_token", "Invalid JWT segments");
  }

  const header = parseJson<JwtHeader>(base64UrlDecode(encodedHeader));
  if (header.alg !== "HS256" || header.typ !== "JWT") {
    throw new JwtAuthError("auth_invalid_token", "Unsupported JWT header");
  }

  const expectedSignature = signHmacSha256(
    `${encodedHeader}.${encodedPayload}`,
    secret,
  );
  if (!base64UrlSignaturesEqual(receivedSignature, expectedSignature)) {
    throw new JwtAuthError("auth_invalid_token", "Invalid JWT signature");
  }

  const payload = parseJson<Partial<JwtClaims>>(base64UrlDecode(encodedPayload));
  const claims = normalizeClaims(payload);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (claims.exp <= nowSeconds) {
    throw new JwtAuthError("auth_token_expired", "JWT token is expired");
  }
  return claims;
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

function signHmacSha256(value: string, secret: string): string {
  return base64UrlFromBuffer(
    createHmac("sha256", secret).update(value, "utf8").digest(),
  );
}

function base64UrlEncode(value: string): string {
  return base64UrlFromBuffer(Buffer.from(value, "utf8"));
}

function base64UrlDecode(value: string): string {
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const pad = normalized.length % 4;
    const padded = normalized + (pad === 0 ? "" : "=".repeat(4 - pad));
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    throw new JwtAuthError("auth_invalid_token", "Invalid JWT encoding");
  }
}

function base64UrlFromBuffer(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
}

function base64UrlSignaturesEqual(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a.replaceAll("-", "+").replaceAll("_", "/"), "base64");
    const right = Buffer.from(b.replaceAll("-", "+").replaceAll("_", "/"), "base64");
    if (left.length === 0 || right.length === 0 || left.length !== right.length) {
      return false;
    }
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function parseJson<T>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new JwtAuthError("auth_invalid_token", "Invalid JWT JSON");
  }
}
