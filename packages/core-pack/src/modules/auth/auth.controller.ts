import {
  createPluginApiResponder,
  HttpController,
  toOpenApiSchema,
  type HttpContext,
  type HttpMiddleware,
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import { CORE_PACK_OPENAPI_TAGS } from "../openapi-tags.js";
import {
  createJwtAuthMiddleware,
  extractBearerToken,
  getAuthenticatedUser,
} from "./auth.middleware.js";
import {
  AuthErrorResponseSchema,
  AuthLogoutResponseSchema,
  AuthMeResponseSchema,
  AuthSessionResponseSchema,
  LoginWithPasswordInputSchema,
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
      requireAdmin: false,
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
            schema: toOpenApiSchema(LoginWithPasswordInputSchema),
          },
          responses: {
            200: {
              description: "Authenticated session token",
              schema: toOpenApiSchema(AuthSessionResponseSchema),
            },
            401: {
              description: "Authentication failed",
              schema: toOpenApiSchema(AuthErrorResponseSchema),
            },
          },
        },
      })
      .get("/v1/auth/me", this.me, {
        middlewares: [this.authMiddleware],
        docs: {
          summary: "Resolve current authenticated user",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "getAuthenticatedUser",
          responses: {
            200: {
              description: "Authenticated user",
              schema: toOpenApiSchema(AuthMeResponseSchema),
            },
            401: {
              description: "Authentication failed",
              schema: toOpenApiSchema(AuthErrorResponseSchema),
            },
          },
        },
      })
      .post("/v1/auth/logout", this.logout, {
        middlewares: [this.authMiddleware],
        docs: {
          summary: "Logout current JWT session on client side",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "logoutSession",
          responses: {
            200: {
              description: "Session revocation result",
              schema: toOpenApiSchema(AuthLogoutResponseSchema),
            },
            401: {
              description: "Authentication failed",
              schema: toOpenApiSchema(AuthErrorResponseSchema),
            },
          },
        },
      })
      .build();
  }

  private login = async (ctx: HttpContext) => {
    try {
      const payload = LoginWithPasswordInputSchema.parse(ctx.body);
      const session = await this.auth.loginWithPassword(payload);
      return responder.success(session);
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

  private logout = async (ctx: HttpContext) => {
    try {
      const bearerToken = extractBearerToken(ctx);
      if (!bearerToken) {
        return responder.invalidRequest("Missing bearer token");
      }
      const revoked = await this.auth.revokeBearerToken(bearerToken);
      return responder.success({ revoked });
    } catch (error) {
      return responder.fromError(error);
    }
  };
}
