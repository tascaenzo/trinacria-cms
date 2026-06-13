import { getCookieValue, serializeCookie, type HttpContext } from "@trinacria-cms/kernel";
import type { RuntimeConfigService } from "../settings/config/runtime-config.service.js";
import type { LoginResult } from "./auth.service.js";

export interface JwtCookieConfig {
  accessCookieName: string;
  refreshCookieName: string;
  path: string;
  domain?: string;
  sameSite: "Strict" | "Lax" | "None";
  secure: boolean;
}

export async function readJwtCookieConfig(
  config: RuntimeConfigService,
  envFallback?: JwtCookieConfig
): Promise<JwtCookieConfig> {
  const fallback = envFallback ?? readJwtCookieConfigFromEnv();

  const accessCookieName =
    (await config.getString("core-pack:auth:jwt_cookie_access_name", {
      fallback: fallback.accessCookieName
    })) ?? fallback.accessCookieName;
  const refreshCookieName =
    (await config.getString("core-pack:auth:jwt_cookie_refresh_name", {
      fallback: fallback.refreshCookieName
    })) ?? fallback.refreshCookieName;
  const path =
    (await config.getString("core-pack:auth:jwt_cookie_path", {
      fallback: fallback.path
    })) ?? fallback.path;
  const domainRaw =
    (await config.getString("core-pack:auth:jwt_cookie_domain", {
      fallback: fallback.domain ?? ""
    })) ?? "";
  const sameSiteRaw =
    (await config.getString("core-pack:auth:jwt_cookie_same_site", {
      fallback: fallback.sameSite
    })) ?? fallback.sameSite;
  const secure =
    (await config.getBoolean("core-pack:auth:jwt_cookie_secure", {
      fallback: fallback.secure
    })) ?? fallback.secure;

  return {
    accessCookieName,
    refreshCookieName,
    path,
    domain: domainRaw.trim() ? domainRaw.trim() : undefined,
    sameSite: normalizeSameSite(sameSiteRaw, fallback.sameSite),
    secure
  };
}

export function readJwtCookieConfigFromEnv(): JwtCookieConfig {
  const sameSiteRaw = process.env.CMS_JWT_COOKIE_SAME_SITE?.trim().toLowerCase();
  const sameSite: JwtCookieConfig["sameSite"] =
    sameSiteRaw === "strict" ? "Strict" : sameSiteRaw === "none" ? "None" : "Lax";
  const defaultSecure = sameSite === "None" || isProductionLikeNodeEnv();

  return {
    accessCookieName: process.env.CMS_JWT_ACCESS_COOKIE_NAME?.trim() || "cms_access_token",
    refreshCookieName: process.env.CMS_JWT_REFRESH_COOKIE_NAME?.trim() || "cms_refresh_token",
    path: process.env.CMS_JWT_COOKIE_PATH?.trim() || "/",
    domain: process.env.CMS_JWT_COOKIE_DOMAIN?.trim() || undefined,
    sameSite,
    secure: readBooleanEnv("CMS_JWT_COOKIE_SECURE", defaultSecure)
  };
}

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

export function extractAccessTokenFromCookie(
  ctx: Pick<HttpContext, "req">,
  config: JwtCookieConfig
): string | null {
  const value = getCookieValue(ctx, config.accessCookieName);
  return value?.trim() || null;
}

export function extractRefreshTokenFromCookie(
  ctx: Pick<HttpContext, "req">,
  config: JwtCookieConfig
): string | null {
  const value = getCookieValue(ctx, config.refreshCookieName);
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

function isProductionLikeNodeEnv(): boolean {
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
  return nodeEnv === "production" || nodeEnv === "staging";
}

function normalizeSameSite(
  value: string,
  fallback: JwtCookieConfig["sameSite"]
): JwtCookieConfig["sameSite"] {
  const raw = value.trim().toLowerCase();
  if (raw === "strict") return "Strict";
  if (raw === "none") return "None";
  if (raw === "lax") return "Lax";
  return fallback;
}
