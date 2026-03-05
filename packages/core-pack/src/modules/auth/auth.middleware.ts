import {
  apiError,
  response,
  type HttpContext,
  type HttpMiddleware,
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import { UserRecordSchema, type UserRecord } from "../users/users.schemas.js";
import { JwtAuthError, JwtAuthService } from "./auth.service.js";

export const AUTHENTICATED_USER_STATE_KEY = "corePack.auth.authenticatedUser";

/**
 * Bearer-token middleware for JWT authentication.
 * On success, the authenticated user is attached to `ctx.state`.
 */
export function createJwtAuthMiddleware(
  auth: JwtAuthService,
  options?: { requireAdmin?: boolean },
): HttpMiddleware {
  return async (ctx, next) => {
    const bearerToken = extractBearerToken(ctx);
    if (!bearerToken) {
      return unauthorized("auth_missing_token", "Missing bearer token");
    }

    try {
      const user = await auth.authenticateBearerToken(bearerToken, options);
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
  const header = getHeader(ctx, "authorization");
  if (!header) return null;
  const matched = /^Bearer\s+(.+)$/i.exec(header.trim());
  return matched?.[1]?.trim() ?? null;
}

function getHeader(ctx: HttpContext, name: string): string | undefined {
  const request = toNodeRequest(ctx.req);
  const value = request.headers?.[name.toLowerCase()];
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function toNodeRequest(value: unknown): {
  headers?: Record<string, string | string[] | undefined>;
} {
  if (!value || typeof value !== "object") {
    return {};
  }

  const maybeRequest = value as { headers?: unknown };
  const headersRaw =
    maybeRequest.headers && typeof maybeRequest.headers === "object"
      ? (maybeRequest.headers as Record<string, unknown>)
      : undefined;
  const headers: Record<string, string | string[] | undefined> = {};

  if (headersRaw) {
    for (const [key, headerValue] of Object.entries(headersRaw)) {
      if (typeof headerValue === "string") {
        headers[key.toLowerCase()] = headerValue;
      } else if (Array.isArray(headerValue)) {
        const normalized = headerValue.filter(
          (item): item is string => typeof item === "string",
        );
        headers[key.toLowerCase()] = normalized.length > 0 ? normalized : undefined;
      }
    }
  }

  return { headers };
}

function unauthorized(
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  return response(apiError(code, message, details, { pluginId: CORE_PACK_PLUGIN_ID }), {
    status: 401,
  });
}

function forbidden(
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  return response(apiError(code, message, details, { pluginId: CORE_PACK_PLUGIN_ID }), {
    status: 403,
  });
}
