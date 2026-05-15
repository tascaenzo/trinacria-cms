import {
  apiError,
  getRequestHeader,
  response,
  type HttpContext,
  type HttpMiddleware
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import { UserRecordSchema, type UserRecord } from "../users/users.schemas.js";
import { extractAccessTokenFromCookie, readJwtCookieConfigFromEnv } from "./auth-session.js";
import { JwtAuthError, JwtAuthService } from "./auth.service.js";

export const AUTHENTICATED_USER_STATE_KEY = "corePack.auth.authenticatedUser";

/**
 * Bearer-token middleware for JWT authentication.
 * On success, the authenticated user is attached to `ctx.state`.
 */
export function createJwtAuthMiddleware(
  auth: JwtAuthService,
  options?: { requireAdmin?: boolean }
): HttpMiddleware {
  const cookieConfig = readJwtCookieConfigFromEnv();

  return async (ctx, next) => {
    const token = extractAuthToken(ctx, cookieConfig);
    if (!token) {
      return unauthorized("auth_missing_token", "Missing bearer token");
    }

    try {
      const user = await auth.authenticateBearerToken(token, options);
      ctx.state[AUTHENTICATED_USER_STATE_KEY] = user;
      return next();
    } catch (error) {
      if (error instanceof JwtAuthError) {
        if (error.code === "auth_forbidden_admin_required") {
          return forbidden(error.code, error.message, error.details);
        }
        return unauthorized(error.code, error.message, error.details);
      }
      return unauthorized("auth_unauthorized", "Unauthorized request");
    }
  };
}

/**
 * Reads authenticated user from request state.
 */
export function getAuthenticatedUser(ctx: HttpContext): UserRecord {
  const value = ctx.state[AUTHENTICATED_USER_STATE_KEY];
  return UserRecordSchema.parse(value);
}

/**
 * Extracts bearer token from Authorization header.
 */
export function extractBearerToken(ctx: HttpContext): string | null {
  const header = getRequestHeader(ctx, "authorization");
  if (!header) return null;
  const matched = /^Bearer\s+(.+)$/i.exec(header.trim());
  return matched?.[1]?.trim() ?? null;
}

/**
 * Extracts JWT token from Authorization bearer header or access-token cookie.
 * Header takes precedence over cookie when both are present.
 */
export function extractAuthToken(
  ctx: HttpContext,
  cookieConfig = readJwtCookieConfigFromEnv()
): string | null {
  const bearerToken = extractBearerToken(ctx);
  if (bearerToken) return bearerToken;
  return extractAccessTokenFromCookie(ctx, cookieConfig);
}

function unauthorized(code: string, message: string, details?: Record<string, unknown>) {
  return response(apiError(code, message, details, { pluginId: CORE_PACK_PLUGIN_ID }), {
    status: 401
  });
}

function forbidden(code: string, message: string, details?: Record<string, unknown>) {
  return response(apiError(code, message, details, { pluginId: CORE_PACK_PLUGIN_ID }), {
    status: 403
  });
}
