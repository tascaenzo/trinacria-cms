/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { AcceptUserInviteRequest, AcceptUserInviteResponse, ChangeAuthenticatedUserPasswordRequest, ChangeAuthenticatedUserPasswordResponse, CompletePasswordResetRequest, CompletePasswordResetResponse, ConfirmEmailVerificationRequest, ConfirmEmailVerificationResponse, GetAuthenticatedUserRequest, GetAuthenticatedUserResponse, LoginWithPasswordRequest, LoginWithPasswordResponse, LogoutSessionRequest, LogoutSessionResponse, RegisterPublicUserRequest, RegisterPublicUserResponse, RequestEmailVerificationRequest, RequestEmailVerificationResponse, RequestPasswordResetRequest, RequestPasswordResetResponse, UpdateAuthenticatedUserProfileRequest, UpdateAuthenticatedUserProfileResponse } from "./types.gen.js";

export interface AuthApi {
  acceptUserInvite(input: AcceptUserInviteRequest, options?: SdkRequestOverrides): Promise<AcceptUserInviteResponse>;
  changeAuthenticatedUserPassword(input: ChangeAuthenticatedUserPasswordRequest, options?: SdkRequestOverrides): Promise<ChangeAuthenticatedUserPasswordResponse>;
  completePasswordReset(input: CompletePasswordResetRequest, options?: SdkRequestOverrides): Promise<CompletePasswordResetResponse>;
  confirmEmailVerification(input: ConfirmEmailVerificationRequest, options?: SdkRequestOverrides): Promise<ConfirmEmailVerificationResponse>;
  getAuthenticatedUser(options?: SdkRequestOverrides): Promise<GetAuthenticatedUserResponse>;
  loginWithPassword(input: LoginWithPasswordRequest, options?: SdkRequestOverrides): Promise<LoginWithPasswordResponse>;
  logoutSession(options?: SdkRequestOverrides): Promise<LogoutSessionResponse>;
  registerPublicUser(input: RegisterPublicUserRequest, options?: SdkRequestOverrides): Promise<RegisterPublicUserResponse>;
  requestEmailVerification(input: RequestEmailVerificationRequest, options?: SdkRequestOverrides): Promise<RequestEmailVerificationResponse>;
  requestPasswordReset(input: RequestPasswordResetRequest, options?: SdkRequestOverrides): Promise<RequestPasswordResetResponse>;
  updateAuthenticatedUserProfile(input: UpdateAuthenticatedUserProfileRequest, options?: SdkRequestOverrides): Promise<UpdateAuthenticatedUserProfileResponse>;
}

export function createAuthApi(client: CmsSdkClientCore): AuthApi {
  return {
    acceptUserInvite: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/auth/invite/accept",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    changeAuthenticatedUserPassword: async (input, options) =>
      client.request({
        method: "PATCH",
        path: "/v1/auth/me/password",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    completePasswordReset: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/auth/password-reset/complete",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    confirmEmailVerification: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/auth/email-verification/confirm",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getAuthenticatedUser: async (options) =>
      client.request({
        method: "GET",
        path: "/v1/auth/me",
        pathParams: undefined,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    loginWithPassword: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/auth/login",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    logoutSession: async (options) =>
      client.request({
        method: "POST",
        path: "/v1/auth/logout",
        pathParams: undefined,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    registerPublicUser: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/auth/register",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    requestEmailVerification: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/auth/email-verification/request",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    requestPasswordReset: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/auth/password-reset/request",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    updateAuthenticatedUserProfile: async (input, options) =>
      client.request({
        method: "PATCH",
        path: "/v1/auth/me",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      })
  };
}
