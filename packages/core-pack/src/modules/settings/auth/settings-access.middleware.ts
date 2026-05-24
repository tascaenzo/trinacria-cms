import { apiError, response, type HttpContext, type HttpMiddleware } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import { AUTHENTICATED_USER_STATE_KEY, extractAuthToken } from "../../auth/auth.middleware.js";
import { JwtAuthError, type JwtAuthService } from "../../auth/auth.service.js";
import { SETTINGS_AUTH_PLUGIN_ID_STATE_KEY } from "./plugin-auth.middleware.js";
import { PLUGIN_AUTH_HEADERS } from "./plugin-auth.js";
import {
  SettingsPluginAuthError,
  type SettingsPluginAuthService
} from "./plugin-auth.service.js";

export type SettingsAccessMode = "admin" | "plugin";

export const SETTINGS_ACCESS_MODE_STATE_KEY = "corePack.settings.accessMode";

export function createSettingsAccessMiddleware(
  auth: JwtAuthService,
  pluginAuth: SettingsPluginAuthService,
  options: {
    allowAdmin: boolean;
    allowPlugin: boolean;
  }
): HttpMiddleware {
  return async (ctx, next) => {
    const authToken = extractAuthToken(ctx);
    const hasPluginHeaders = hasPluginAuthHeaders(ctx);

    if (options.allowAdmin && authToken) {
      try {
        const user = await auth.authenticateBearerToken(authToken, {
          requireAdmin: true
        });
        ctx.state[AUTHENTICATED_USER_STATE_KEY] = user;
        ctx.state[SETTINGS_ACCESS_MODE_STATE_KEY] = "admin" satisfies SettingsAccessMode;
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
    }

    if (options.allowPlugin && hasPluginHeaders) {
      try {
        const pluginId = await pluginAuth.authenticateRequest(ctx);
        ctx.state[SETTINGS_AUTH_PLUGIN_ID_STATE_KEY] = pluginId;
        ctx.state[SETTINGS_ACCESS_MODE_STATE_KEY] = "plugin" satisfies SettingsAccessMode;
        return next();
      } catch (error) {
        if (error instanceof SettingsPluginAuthError) {
          return unauthorized(error.code, error.message, error.details);
        }
        return unauthorized("auth_unauthorized", "Unauthorized request");
      }
    }

    return unauthorized("auth_missing_token", buildMissingCredentialsMessage(options));
  };
}

export function getSettingsAccessMode(ctx: HttpContext): SettingsAccessMode {
  const mode = ctx.state[SETTINGS_ACCESS_MODE_STATE_KEY];
  if (mode === "admin" || mode === "plugin") {
    return mode;
  }
  throw new Error("Missing settings access mode in request context");
}

function hasPluginAuthHeaders(ctx: HttpContext): boolean {
  const request = toNodeRequest(ctx.req);
  const headers = request.headers ?? {};
  return Object.values(PLUGIN_AUTH_HEADERS).every((headerName) => {
    const value = headers[headerName.toLowerCase()];
    if (!value) return false;
    return Array.isArray(value) ? value.some(Boolean) : value.trim().length > 0;
  });
}

function buildMissingCredentialsMessage(options: {
  allowAdmin: boolean;
  allowPlugin: boolean;
}): string {
  if (options.allowAdmin && options.allowPlugin) {
    return "Missing admin bearer token or signed plugin authentication headers";
  }
  if (options.allowAdmin) {
    return "Missing bearer token";
  }
  return "Missing signed plugin authentication headers";
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
        const normalized = headerValue.filter((item): item is string => typeof item === "string");
        headers[key.toLowerCase()] = normalized.length > 0 ? normalized : undefined;
      }
    }
  }

  return { headers };
}
