import { type DbAdapter, getCookieValue, serializeCookie, type HttpContext } from "@trinacria-cms/kernel";
import { readCorePackSettingValue } from "../settings/runtime-settings.js";
import type { LoginResult } from "./auth.service.js";

export interface JwtCookieConfig {
  accessCookieName: string;
  refreshCookieName: string;
  path: string;
  domain?: string;
  sameSite: "Strict" | "Lax" | "None";
  secure: boolean;
}

/**
 * Reads JWT cookie policy from environment.
 * Defaults are secure-by-default and suitable for production.
 */
export function readJwtCookieConfigFromEnv(): JwtCookieConfig {
  const sameSiteRaw = process.env.CMS_JWT_COOKIE_SAME_SITE?.trim().toLowerCase();
  const sameSite: JwtCookieConfig["sameSite"] =
    sameSiteRaw === "strict" ? "Strict" : sameSiteRaw === "none" ? "None" : "Lax";

  return {
    accessCookieName: process.env.CMS_JWT_ACCESS_COOKIE_NAME?.trim() || "cms_access_token",
    refreshCookieName: process.env.CMS_JWT_REFRESH_COOKIE_NAME?.trim() || "cms_refresh_token",
    path: process.env.CMS_JWT_COOKIE_PATH?.trim() || "/",
    domain: process.env.CMS_JWT_COOKIE_DOMAIN?.trim() || undefined,
    sameSite,
    secure: readBooleanEnv("CMS_JWT_COOKIE_SECURE", true)
  };
}

export async function readJwtCookieConfig(
  db: DbAdapter,
  fallback = readJwtCookieConfigFromEnv()
): Promise<JwtCookieConfig> {
  const accessCookieName = await readStringSetting(
    db,
    "core-pack:auth:jwt_cookie_access_name",
    fallback.accessCookieName
  );
  const refreshCookieName = await readStringSetting(
    db,
    "core-pack:auth:jwt_cookie_refresh_name",
    fallback.refreshCookieName
  );
  const path = await readStringSetting(db, "core-pack:auth:jwt_cookie_path", fallback.path);
  const domainRaw = await readStringSetting(
    db,
    "core-pack:auth:jwt_cookie_domain",
    fallback.domain ?? ""
  );
  const sameSiteRaw = await readStringSetting(
    db,
    "core-pack:auth:jwt_cookie_same_site",
    fallback.sameSite
  );
  const secure = await readBooleanSetting(
    db,
    "core-pack:auth:jwt_cookie_secure",
    fallback.secure
  );

  return {
    accessCookieName,
    refreshCookieName,
    path,
    domain: domainRaw.trim() ? domainRaw.trim() : undefined,
    sameSite: normalizeSameSite(sameSiteRaw, fallback.sameSite),
    secure
  };
}

/**
 * Builds Set-Cookie headers for login response.
 */
export function buildLoginSetCookieHeaders(
  session: LoginResult,
  config: JwtCookieConfig
): readonly string[] {
  const accessMaxAge = secondsUntil(session.expiresAt);
  const refreshMaxAge = secondsUntil(session.refreshExpiresAt);
  const cookieOptions = {
    path: config.path,
    domain: config.domain,
    sameSite: config.sameSite,
    secure: config.secure,
    httpOnly: true
  } as const;

  return [
    serializeCookie(config.accessCookieName, session.accessToken, {
      ...cookieOptions,
      maxAgeSeconds: accessMaxAge
    }),
    serializeCookie(config.refreshCookieName, session.refreshToken, {
      ...cookieOptions,
      maxAgeSeconds: refreshMaxAge
    })
  ];
}

/**
 * Builds Set-Cookie headers that clear auth cookies.
 */
export function buildLogoutClearCookieHeaders(config: JwtCookieConfig): readonly string[] {
  const cookieOptions = {
    path: config.path,
    domain: config.domain,
    sameSite: config.sameSite,
    secure: config.secure,
    httpOnly: true,
    maxAgeSeconds: 0
  } as const;

  return [
    serializeCookie(config.accessCookieName, "", cookieOptions),
    serializeCookie(config.refreshCookieName, "", cookieOptions)
  ];
}

/**
 * Extracts access token from auth cookie.
 */
export function extractAccessTokenFromCookie(
  ctx: Pick<HttpContext, "req">,
  config: JwtCookieConfig
): string | null {
  const value = getCookieValue(ctx, config.accessCookieName);
  return value?.trim() || null;
}

function secondsUntil(isoDateTime: string): number {
  const expiresAt = Number(new Date(isoDateTime));
  if (!Number.isFinite(expiresAt)) {
    return 0;
  }
  const seconds = Math.floor((expiresAt - Date.now()) / 1000);
  return seconds > 0 ? seconds : 0;
}

function readBooleanEnv(name: string, defaultValue: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return defaultValue;
  if (value === "true" || value === "1" || value === "yes") return true;
  if (value === "false" || value === "0" || value === "no") return false;
  return defaultValue;
}

function normalizeSameSite(value: string, fallback: JwtCookieConfig["sameSite"]): JwtCookieConfig["sameSite"] {
  const raw = value.trim().toLowerCase();
  if (raw === "strict") return "Strict";
  if (raw === "none") return "None";
  if (raw === "lax") return "Lax";
  return fallback;
}

async function readStringSetting(db: DbAdapter, key: string, fallback: string): Promise<string> {
  const value = await readCorePackSettingValue(db, key);
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized || fallback;
}

async function readBooleanSetting(db: DbAdapter, key: string, fallback: boolean): Promise<boolean> {
  const value = await readCorePackSettingValue(db, key);
  return typeof value === "boolean" ? value : fallback;
}
