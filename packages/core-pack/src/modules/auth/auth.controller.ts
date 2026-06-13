import {
  createPluginApiResponder,
  HttpController,
  response,
  toOpenApiSchema,
  type HttpContext,
  type HttpMiddleware
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import { CORE_PACK_OPENAPI_TAGS } from "../openapi-tags.js";
import {
  buildLoginSetCookieHeaders,
  buildLogoutClearCookieHeaders,
  extractRefreshTokenFromCookie
} from "./auth-session.js";
import {
  createJwtAuthMiddleware,
  extractAuthToken,
  getAuthenticatedUser
} from "./auth.middleware.js";
import {
  AuthErrorResponseSchema,
  AuthLogoutResponseSchema,
  AuthMeResponseSchema,
  AuthSessionResponseSchema,
  ChangeAuthenticatedUserPasswordInputSchema,
  LoginWithPasswordInputSchema,
  UpdateAuthenticatedUserProfileInputSchema
} from "./dto/index.js";
import type { JwtAuthService } from "./auth.service.js";

const responder = createPluginApiResponder(CORE_PACK_PLUGIN_ID);

/**
 * Public authentication API for local admin/operator login.
 */
export class AuthController extends HttpController {
  private readonly authMiddleware: HttpMiddleware;

  constructor(private readonly auth: JwtAuthService) {
    super();
    this.authMiddleware = createJwtAuthMiddleware(this.auth, {
      requireAdmin: false
    });
  }

  routes() {
    return this.router()
      .post("/v1/auth/login", this.login, {
        docs: {
          summary: "Login with email and password",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "loginWithPassword",
          requestBody: {
            required: true,
            schema: toOpenApiSchema(LoginWithPasswordInputSchema)
          },
          responses: {
            200: {
              description: "Authenticated session token",
              schema: toOpenApiSchema(AuthSessionResponseSchema)
            },
            401: {
              description: "Authentication failed",
              schema: toOpenApiSchema(AuthErrorResponseSchema)
            }
          }
        }
      })
      .get("/v1/auth/me", this.me, {
        middlewares: [this.authMiddleware],
        docs: {
          summary: "Resolve current authenticated user",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "getAuthenticatedUser",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Authenticated user",
              schema: toOpenApiSchema(AuthMeResponseSchema)
            },
            401: {
              description: "Authentication failed",
              schema: toOpenApiSchema(AuthErrorResponseSchema)
            }
          }
        }
      })
      .patch("/v1/auth/me", this.updateMe, {
        middlewares: [this.authMiddleware],
        docs: {
          summary: "Update current authenticated user profile",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "updateAuthenticatedUserProfile",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            schema: toOpenApiSchema(UpdateAuthenticatedUserProfileInputSchema)
          },
          responses: {
            200: {
              description: "Updated authenticated user",
              schema: toOpenApiSchema(AuthMeResponseSchema)
            },
            401: {
              description: "Authentication failed",
              schema: toOpenApiSchema(AuthErrorResponseSchema)
            }
          }
        }
      })
      .patch("/v1/auth/me/password", this.changePassword, {
        middlewares: [this.authMiddleware],
        docs: {
          summary: "Change current authenticated user password",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "changeAuthenticatedUserPassword",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            schema: toOpenApiSchema(ChangeAuthenticatedUserPasswordInputSchema)
          },
          responses: {
            200: {
              description: "Password changed",
              schema: toOpenApiSchema(AuthMeResponseSchema)
            },
            401: {
              description: "Authentication failed",
              schema: toOpenApiSchema(AuthErrorResponseSchema)
            }
          }
        }
      })
      .post("/v1/auth/logout", this.logout, {
        docs: {
          summary: "Logout current JWT session and clear auth cookies",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "logoutSession",
          responses: {
            200: {
              description: "Session revocation result",
              schema: toOpenApiSchema(AuthLogoutResponseSchema)
            },
            401: {
              description: "Authentication failed",
              schema: toOpenApiSchema(AuthErrorResponseSchema)
            }
          }
        }
      })
      .build();
  }

  private login = async (ctx: HttpContext) => {
    try {
      const payload = LoginWithPasswordInputSchema.parse(ctx.body);
      const session = await this.auth.loginWithPassword(payload);
      const cookieConfig = await this.auth.getJwtCookieConfig();
      const publicSession = {
        accessToken: session.accessToken,
        tokenType: session.tokenType,
        expiresAt: session.expiresAt,
        refreshExpiresAt: session.refreshExpiresAt,
        user: session.user
      };
      return response(responder.success(publicSession), {
        headers: {
          "set-cookie": buildLoginSetCookieHeaders(session, cookieConfig)
        }
      });
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private me = async (ctx: HttpContext) => {
    try {
      return responder.success(getAuthenticatedUser(ctx));
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private updateMe = async (ctx: HttpContext) => {
    try {
      const user = getAuthenticatedUser(ctx);
      const payload = UpdateAuthenticatedUserProfileInputSchema.parse(ctx.body);
      const updated = await this.auth.updateAuthenticatedUserProfile(user.id, payload);
      return responder.success(updated);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private changePassword = async (ctx: HttpContext) => {
    try {
      const user = getAuthenticatedUser(ctx);
      const payload = ChangeAuthenticatedUserPasswordInputSchema.parse(ctx.body);
      const updated = await this.auth.changeAuthenticatedUserPassword(user.id, payload);
      return responder.success(updated);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private logout = async (ctx: HttpContext) => {
    try {
      const cookieConfig = await this.auth.getJwtCookieConfig();
      const token = extractAuthToken(ctx, cookieConfig);
      const refreshToken = extractRefreshTokenFromCookie(ctx, cookieConfig);
      const revokedAccess = token ? await this.auth.revokeBearerToken(token) : false;
      const revokedRefresh = refreshToken ? await this.auth.revokeBearerToken(refreshToken) : false;
      const revoked = revokedAccess || revokedRefresh;
      return response(responder.success({ revoked }), {
        headers: {
          "set-cookie": buildLogoutClearCookieHeaders(cookieConfig)
        }
      });
    } catch (error) {
      return responder.fromError(error);
    }
  };
}
