import type { HttpContext, HttpMiddleware } from "@trinacria-cms/kernel";
import { SettingsPluginAuthService } from "./plugin-auth.service.js";

export const SETTINGS_AUTH_PLUGIN_ID_STATE_KEY = "corePack.settings.authenticatedPluginId";

/**
 * Route middleware enforcing signed plugin-caller authentication.
 */
export function createSettingsPluginAuthMiddleware(
  auth: SettingsPluginAuthService
): HttpMiddleware {
  return async (ctx, next) => {
    const pluginId = await auth.authenticateRequest(ctx);
    ctx.state[SETTINGS_AUTH_PLUGIN_ID_STATE_KEY] = pluginId;
    return next();
  };
}

/**
 * Reads authenticated plugin id from request context state.
 */
export function getAuthenticatedPluginId(ctx: HttpContext): string {
  const value = ctx.state[SETTINGS_AUTH_PLUGIN_ID_STATE_KEY];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Missing authenticated plugin caller in request context");
  }
  return value;
}
