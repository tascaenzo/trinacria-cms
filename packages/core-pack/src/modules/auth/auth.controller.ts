import {
  createPluginApiResponder,
  type HttpContext,
  HttpController,
  type HttpMiddleware,
  response,
  toOpenApiSchema
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import { CORE_PACK_OPENAPI_TAGS } from "../openapi-tags.js";
import type { UserRecord } from "../users/users.schemas.js";
import {
  createJwtAuthMiddleware,
  extractAuthToken,
  getAuthenticatedUser
} from "./auth.middleware.js";
import {
  buildLoginSetCookieHeaders,
  buildLogoutClearCookieHeaders,
  extractRefreshTokenFromCookie
} from "./auth-session.js";
import {
  AcceptUserInviteInputSchema,
  AuthErrorResponseSchema,
  AuthLogoutResponseSchema,
  AuthMeResponseSchema,
  AuthMfaEnrollmentConfirmationResponseSchema,
  AuthMfaEnrollmentSetupResponseSchema,
  AuthMfaLoginSessionResponseSchema,
  AuthMfaStatusResponseSchema,
  AuthPasswordLoginResponseSchema,
  AuthSessionResponseSchema,
  ChangeAuthenticatedUserPasswordInputSchema,
  CompleteMfaLoginInputSchema,
  CompletePasswordResetInputSchema,
  ConfirmEmailVerificationInputSchema,
  DisableMfaInputSchema,
  LoginWithPasswordInputSchema,
  MfaChallengeInputSchema,
  MfaCodeInputSchema,
  PublicRegistrationInputSchema,
  RequestEmailVerificationInputSchema,
  RequestPasswordResetInputSchema,
  UpdateAuthenticatedUserProfileInputSchema
} from "./dto/index.js";
import type { JwtAuthService } from "./services/auth.service.js";
import type { AuthUserFlowsService } from "./services/auth-user-flows.service.js";

const responder = createPluginApiResponder(CORE_PACK_PLUGIN_ID);

/**
 * Public authentication API for local admin/operator login.
 */
export class AuthController extends HttpController {
  private readonly authMiddleware: HttpMiddleware;

  constructor(
    private readonly auth: JwtAuthService,
    private readonly flows: AuthUserFlowsService
  ) {
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
              schema: toOpenApiSchema(AuthPasswordLoginResponseSchema)
            },
            401: {
              description: "Authentication failed",
              schema: toOpenApiSchema(AuthErrorResponseSchema)
            }
          }
        }
      })
      .post("/v1/auth/login/mfa", this.completeMfaLogin, {
        docs: {
          summary: "Complete login with an authenticator or recovery code",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "completeMfaLogin",
          requestBody: { required: true, schema: toOpenApiSchema(CompleteMfaLoginInputSchema) },
          responses: {
            200: {
              description: "Authenticated session token",
              schema: toOpenApiSchema(AuthMfaLoginSessionResponseSchema)
            },
            401: {
              description: "Authentication failed",
              schema: toOpenApiSchema(AuthErrorResponseSchema)
            }
          }
        }
      })
      .post("/v1/auth/login/mfa/enrollment", this.beginLoginMfaEnrollment, {
        docs: {
          summary: "Begin required MFA enrollment during login",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "beginLoginMfaEnrollment",
          requestBody: { required: true, schema: toOpenApiSchema(MfaChallengeInputSchema) },
          responses: {
            200: {
              description: "Authenticator setup data",
              schema: toOpenApiSchema(AuthMfaEnrollmentSetupResponseSchema)
            },
            401: {
              description: "Authentication failed",
              schema: toOpenApiSchema(AuthErrorResponseSchema)
            }
          }
        }
      })
      .post("/v1/auth/login/mfa/enrollment/confirm", this.completeLoginMfaEnrollment, {
        docs: {
          summary: "Confirm required MFA enrollment and complete login",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "completeLoginMfaEnrollment",
          requestBody: { required: true, schema: toOpenApiSchema(CompleteMfaLoginInputSchema) },
          responses: {
            200: {
              description: "Authenticated session token and recovery codes",
              schema: toOpenApiSchema(AuthMfaLoginSessionResponseSchema)
            },
            401: {
              description: "Authentication failed",
              schema: toOpenApiSchema(AuthErrorResponseSchema)
            }
          }
        }
      })
      .post("/v1/auth/password-reset/request", this.requestPasswordReset, {
        docs: {
          summary: "Request password reset email",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "requestPasswordReset",
          requestBody: {
            required: true,
            schema: toOpenApiSchema(RequestPasswordResetInputSchema)
          },
          responses: {
            200: { description: "Password reset request accepted" }
          }
        }
      })
      .post("/v1/auth/register", this.registerPublic, {
        docs: {
          summary: "Register public user",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "registerPublicUser",
          requestBody: {
            required: true,
            schema: toOpenApiSchema(PublicRegistrationInputSchema)
          },
          responses: {
            200: { description: "Registration accepted" }
          }
        }
      })
      .post("/v1/auth/invite/accept", this.acceptUserInvite, {
        docs: {
          summary: "Accept user invite",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "acceptUserInvite",
          requestBody: {
            required: true,
            schema: toOpenApiSchema(AcceptUserInviteInputSchema)
          },
          responses: {
            200: { description: "Invite accepted" }
          }
        }
      })
      .post("/v1/auth/password-reset/complete", this.completePasswordReset, {
        docs: {
          summary: "Complete password reset",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "completePasswordReset",
          requestBody: {
            required: true,
            schema: toOpenApiSchema(CompletePasswordResetInputSchema)
          },
          responses: {
            200: { description: "Password reset completed" }
          }
        }
      })
      .post("/v1/auth/email-verification/request", this.requestEmailVerification, {
        docs: {
          summary: "Request email verification email",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "requestEmailVerification",
          requestBody: {
            required: true,
            schema: toOpenApiSchema(RequestEmailVerificationInputSchema)
          },
          responses: {
            200: { description: "Email verification request accepted" }
          }
        }
      })
      .post("/v1/auth/email-verification/confirm", this.confirmEmailVerification, {
        docs: {
          summary: "Confirm email verification token",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "confirmEmailVerification",
          requestBody: {
            required: true,
            schema: toOpenApiSchema(ConfirmEmailVerificationInputSchema)
          },
          responses: {
            200: { description: "Email verification completed" }
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
      .get("/v1/auth/mfa", this.mfaStatus, {
        middlewares: [this.authMiddleware],
        docs: {
          summary: "Get MFA enrollment status for the current user",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "getMfaStatus",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "MFA status", schema: toOpenApiSchema(AuthMfaStatusResponseSchema) }
          }
        }
      })
      .post("/v1/auth/mfa/enrollment", this.beginMfaEnrollment, {
        middlewares: [this.authMiddleware],
        docs: {
          summary: "Begin MFA enrollment for the current user",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "beginMfaEnrollment",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Authenticator setup data",
              schema: toOpenApiSchema(AuthMfaEnrollmentSetupResponseSchema)
            }
          }
        }
      })
      .post("/v1/auth/mfa/enrollment/confirm", this.confirmMfaEnrollment, {
        middlewares: [this.authMiddleware],
        docs: {
          summary: "Confirm MFA enrollment for the current user",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "confirmMfaEnrollment",
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, schema: toOpenApiSchema(MfaCodeInputSchema) },
          responses: {
            200: {
              description: "Recovery codes",
              schema: toOpenApiSchema(AuthMfaEnrollmentConfirmationResponseSchema)
            }
          }
        }
      })
      .delete("/v1/auth/mfa", this.disableMfa, {
        middlewares: [this.authMiddleware],
        docs: {
          summary: "Disable MFA for the current user",
          tags: [CORE_PACK_OPENAPI_TAGS.AUTH],
          operationId: "disableMfa",
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, schema: toOpenApiSchema(DisableMfaInputSchema) },
          responses: {
            200: { description: "MFA disabled" },
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
      const result = await this.auth.beginPasswordLogin(payload);
      if ("status" in result) return responder.success(result);
      return this.respondWithSession(result);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private completeMfaLogin = async (ctx: HttpContext) => {
    try {
      const payload = CompleteMfaLoginInputSchema.parse(ctx.body);
      return this.respondWithSession(
        await this.auth.completeMfaLogin(payload.challengeId, payload.code)
      );
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private beginLoginMfaEnrollment = async (ctx: HttpContext) => {
    try {
      const payload = MfaChallengeInputSchema.parse(ctx.body);
      return responder.success(await this.auth.beginMfaEnrollmentForLogin(payload.challengeId));
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private completeLoginMfaEnrollment = async (ctx: HttpContext) => {
    try {
      const payload = CompleteMfaLoginInputSchema.parse(ctx.body);
      return this.respondWithSession(
        await this.auth.completeMfaEnrollmentForLogin(payload.challengeId, payload.code)
      );
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private mfaStatus = async (ctx: HttpContext) => {
    try {
      return responder.success(await this.auth.getMfaStatus(getAuthenticatedUser(ctx).id));
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private beginMfaEnrollment = async (ctx: HttpContext) => {
    try {
      return responder.success(await this.auth.beginMfaEnrollment(getAuthenticatedUser(ctx).id));
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private confirmMfaEnrollment = async (ctx: HttpContext) => {
    try {
      const payload = MfaCodeInputSchema.parse(ctx.body);
      return responder.success(
        await this.auth.confirmMfaEnrollment(getAuthenticatedUser(ctx).id, payload.code)
      );
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private disableMfa = async (ctx: HttpContext) => {
    try {
      const payload = DisableMfaInputSchema.parse(ctx.body);
      await this.auth.disableMfa(getAuthenticatedUser(ctx).id, payload);
      return responder.success({ disabled: true });
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private async respondWithSession(session: {
    accessToken: string;
    refreshToken: string;
    tokenType: "Bearer";
    expiresAt: string;
    refreshExpiresAt: string;
    user: UserRecord;
    recoveryCodes?: readonly string[];
  }) {
    const cookieConfig = await this.auth.getJwtCookieConfig();
    const { refreshToken: _refreshToken, ...publicSession } = session;
    return response(responder.success(publicSession), {
      headers: { "set-cookie": buildLoginSetCookieHeaders(session, cookieConfig) }
    });
  }

  private me = async (ctx: HttpContext) => {
    try {
      return responder.success(getAuthenticatedUser(ctx));
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private requestPasswordReset = async (ctx: HttpContext) => {
    try {
      const payload = RequestPasswordResetInputSchema.parse(ctx.body);
      return responder.success(await this.flows.requestPasswordReset(payload.email));
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private registerPublic = async (ctx: HttpContext) => {
    try {
      const payload = PublicRegistrationInputSchema.parse(ctx.body);
      return responder.success(await this.flows.registerPublic(payload));
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private acceptUserInvite = async (ctx: HttpContext) => {
    try {
      const payload = AcceptUserInviteInputSchema.parse(ctx.body);
      return responder.success(await this.flows.acceptUserInvite(payload));
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private completePasswordReset = async (ctx: HttpContext) => {
    try {
      const payload = CompletePasswordResetInputSchema.parse(ctx.body);
      return responder.success(await this.flows.completePasswordReset(payload));
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private requestEmailVerification = async (ctx: HttpContext) => {
    try {
      const payload = RequestEmailVerificationInputSchema.parse(ctx.body);
      return responder.success(await this.flows.requestEmailVerification(payload.email));
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private confirmEmailVerification = async (ctx: HttpContext) => {
    try {
      const payload = ConfirmEmailVerificationInputSchema.parse(ctx.body);
      return responder.success(await this.flows.confirmEmailVerification(payload.token));
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
