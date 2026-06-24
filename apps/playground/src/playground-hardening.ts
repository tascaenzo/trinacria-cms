import { readFileSync } from "node:fs";
import {
  cors,
  rateLimit,
  requestTimeout,
  response,
  securityHeaders,
  type HttpContext,
  type HttpMiddleware
} from "@trinacria-cms/kernel";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 300;
const MINIMUM_PRODUCTION_JWT_SECRET_LENGTH = 32;

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const WEAK_JWT_SECRETS = new Set([
  "change-me",
  "change-me-with-a-long-random-secret",
  "trinacria",
  "trinacria-cms-dev-secret-change-me",
  "secret",
  "password"
]);

export interface PlaygroundSecurityConfig {
  production: boolean;
  trustProxy: boolean;
  corsOrigins: readonly string[];
  csrfProtection: boolean;
  csrfTrustedOrigins: readonly string[];
  docsEnabled: boolean;
  openApiEnabled: boolean;
  strictJwtSecretRequired: boolean;
  requestTimeoutMs: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  authCookieNames: {
    access: string;
    refresh: string;
  };
}

export function createPlaygroundSecurityConfig(
  env: NodeJS.ProcessEnv = process.env
): PlaygroundSecurityConfig {
  const production = isProductionRuntime(env);
  const corsOrigins = readCsvEnv(env, "HTTP_CORS_ORIGINS");
  const csrfOrigins = readCsvEnv(env, "CMS_CSRF_TRUSTED_ORIGINS");
  const publicOrigins = [
    env.CMS_PUBLIC_ORIGIN,
    env.BACKOFFICE_PUBLIC_ORIGIN,
    env.VITE_CMS_API_BASE_URL
  ].flatMap((value) => (value ? [value] : []));
  const csrfTrustedOrigins = uniqueOrigins([...csrfOrigins, ...corsOrigins, ...publicOrigins]);

  return {
    production,
    trustProxy: readBooleanEnv(env, "HTTP_TRUST_PROXY", production),
    corsOrigins,
    csrfProtection: readBooleanEnv(env, "CMS_CSRF_PROTECTION", production),
    csrfTrustedOrigins,
    docsEnabled: readBooleanEnv(env, "CMS_SWAGGER_ENABLED", !production),
    openApiEnabled: readBooleanEnv(env, "CMS_OPENAPI_ENABLED", !production),
    strictJwtSecretRequired: readBooleanEnv(env, "CMS_STRICT_JWT_SECRET_REQUIRED", production),
    requestTimeoutMs: readNumberEnv(
      env,
      "HTTP_REQUEST_TIMEOUT_MS",
      DEFAULT_REQUEST_TIMEOUT_MS,
      1_000
    ),
    rateLimitWindowMs: readNumberEnv(
      env,
      "HTTP_RATE_LIMIT_WINDOW_MS",
      DEFAULT_RATE_LIMIT_WINDOW_MS,
      1_000
    ),
    rateLimitMax: readNumberEnv(env, "HTTP_RATE_LIMIT_MAX", DEFAULT_RATE_LIMIT_MAX, 1),
    authCookieNames: {
      access: env.CMS_JWT_ACCESS_COOKIE_NAME?.trim() || "cms_access_token",
      refresh: env.CMS_JWT_REFRESH_COOKIE_NAME?.trim() || "cms_refresh_token"
    }
  };
}

export function loadSecretFileEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  if (env.CMS_JWT_SECRET?.trim()) {
    return;
  }

  const secretFile = env.CMS_JWT_SECRET_FILE?.trim();
  if (!secretFile) {
    return;
  }

  env.CMS_JWT_SECRET = readFileSync(secretFile, "utf8").trim();
}

export function assertProductionSecurityConfig(
  config: PlaygroundSecurityConfig,
  env: NodeJS.ProcessEnv = process.env
): void {
  if (!config.production) {
    return;
  }

  if (config.corsOrigins.length === 0) {
    throw new Error("HTTP_CORS_ORIGINS is required in production.");
  }
  if (config.corsOrigins.includes("*")) {
    throw new Error('HTTP_CORS_ORIGINS cannot contain "*" in production.');
  }
  if (!config.strictJwtSecretRequired) {
    throw new Error("CMS_STRICT_JWT_SECRET_REQUIRED must be true in production.");
  }
  validateProductionJwtSecret(env.CMS_JWT_SECRET);
}

export function applyProductionSecurityDefaults(
  config: PlaygroundSecurityConfig,
  env: NodeJS.ProcessEnv = process.env
): void {
  if (!config.production) {
    return;
  }

  env.CMS_STRICT_JWT_SECRET_REQUIRED = "true";
  env.CMS_JWT_COOKIE_SECURE ??= "true";
  env.CMS_JWT_COOKIE_SAME_SITE ??= "lax";
}

export function createHttpMiddlewares(config: PlaygroundSecurityConfig): HttpMiddleware[] {
  const middlewares: HttpMiddleware[] = [
    requestTimeout({
      timeoutMs: config.requestTimeoutMs,
      errorMessage: "Request timed out"
    }),
    securityHeaders({
      mode: config.production ? "production" : "development",
      trustProxy: config.trustProxy,
      contentSecurityPolicy: config.production
        ? {
            directives: {
              "default-src": ["'self'"],
              "base-uri": ["'self'"],
              "frame-ancestors": ["'none'"],
              "object-src": ["'none'"]
            },
            schemaValidation: "warn"
          }
        : false
    }),
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMax,
      trustProxy: config.trustProxy
    })
  ];

  if (config.corsOrigins.length > 0) {
    middlewares.push(
      cors({
        origin: [...config.corsOrigins],
        credentials: true,
        maxAge: 600
      })
    );
  }

  if (config.csrfProtection) {
    middlewares.push(
      createCookieCsrfOriginGuard(config.csrfTrustedOrigins, config.authCookieNames)
    );
  }

  return middlewares;
}

export function createCookieCsrfOriginGuard(
  trustedOrigins: readonly string[],
  authCookieNames: PlaygroundSecurityConfig["authCookieNames"] = {
    access: "cms_access_token",
    refresh: "cms_refresh_token"
  }
): HttpMiddleware {
  const allowed = new Set(trustedOrigins.map(normalizeOrigin).filter(Boolean));
  const accessCookiePattern = createCookiePattern(authCookieNames.access);
  const refreshCookiePattern = createCookiePattern(authCookieNames.refresh);

  return async (ctx, next) => {
    if (!isMutatingRequest(ctx) || !hasCookieAuth(ctx, accessCookiePattern, refreshCookiePattern)) {
      return next();
    }

    const origin = readRequestOrigin(ctx);
    if (origin && allowed.has(origin)) {
      return next();
    }

    return response(
      {
        error: {
          code: "csrf_origin_rejected",
          message: "Request origin is not trusted for cookie-authenticated mutations"
        }
      },
      { status: 403 }
    );
  };
}

function validateProductionJwtSecret(secret: string | undefined): void {
  const normalized = secret?.trim();
  if (!normalized) {
    throw new Error("CMS_JWT_SECRET is required in production.");
  }
  if (normalized.length < MINIMUM_PRODUCTION_JWT_SECRET_LENGTH) {
    throw new Error(
      `CMS_JWT_SECRET must be at least ${MINIMUM_PRODUCTION_JWT_SECRET_LENGTH} characters in production.`
    );
  }
  if (WEAK_JWT_SECRETS.has(normalized.toLowerCase())) {
    throw new Error("CMS_JWT_SECRET uses a known weak placeholder value.");
  }
}

function isProductionRuntime(env: NodeJS.ProcessEnv): boolean {
  const nodeEnv = env.NODE_ENV?.trim().toLowerCase();
  return nodeEnv === "production" || nodeEnv === "staging";
}

function isMutatingRequest(ctx: HttpContext): boolean {
  return MUTATING_METHODS.has((ctx.req.method ?? "GET").toUpperCase());
}

function hasCookieAuth(ctx: HttpContext, accessPattern: RegExp, refreshPattern: RegExp): boolean {
  const cookie = ctx.req.headers.cookie;
  if (!cookie) {
    return false;
  }
  return accessPattern.test(cookie) || refreshPattern.test(cookie);
}

function readRequestOrigin(ctx: HttpContext): string | undefined {
  const origin = readHeader(ctx, "origin");
  if (origin) {
    return normalizeOrigin(origin);
  }

  const referer = readHeader(ctx, "referer");
  if (!referer) {
    return undefined;
  }

  return normalizeOrigin(referer);
}

function readHeader(ctx: HttpContext, name: string): string | undefined {
  const value = ctx.req.headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function readCsvEnv(env: NodeJS.ProcessEnv, name: string): string[] {
  return (
    env[name]
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? []
  );
}

function readBooleanEnv(env: NodeJS.ProcessEnv, name: string, fallback: boolean): boolean {
  const raw = env[name]?.trim().toLowerCase();
  if (!raw) {
    return fallback;
  }
  return raw === "true" || raw === "1" || raw === "yes";
}

function readNumberEnv(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  min: number
): number {
  const raw = env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(Math.floor(parsed), min);
}

function uniqueOrigins(values: readonly string[]): string[] {
  return [...new Set(values.map(normalizeOrigin).filter(Boolean))];
}

function normalizeOrigin(value: string): string {
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return "";
  }
}

function createCookiePattern(name: string): RegExp {
  return new RegExp(`(?:^|;\\s*)${escapeRegExp(name)}=`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
