/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { AcceptUserInviteRequest, AcceptUserInviteResponse, BeginLoginMfaEnrollmentRequest, BeginLoginMfaEnrollmentResponse, BeginMfaEnrollmentRequest, BeginMfaEnrollmentResponse, ChangeAuthenticatedUserPasswordRequest, ChangeAuthenticatedUserPasswordResponse, CompleteLoginMfaEnrollmentRequest, CompleteLoginMfaEnrollmentResponse, CompleteMfaLoginRequest, CompleteMfaLoginResponse, CompletePasswordResetRequest, CompletePasswordResetResponse, ConfirmEmailVerificationRequest, ConfirmEmailVerificationResponse, ConfirmMfaEnrollmentRequest, ConfirmMfaEnrollmentResponse, DisableMfaRequest, DisableMfaResponse, GetAuthenticatedUserRequest, GetAuthenticatedUserResponse, GetMfaStatusRequest, GetMfaStatusResponse, LoginWithPasswordRequest, LoginWithPasswordResponse, LogoutSessionRequest, LogoutSessionResponse, RegisterPublicUserRequest, RegisterPublicUserResponse, RequestEmailVerificationRequest, RequestEmailVerificationResponse, RequestPasswordResetRequest, RequestPasswordResetResponse, UpdateAuthenticatedUserProfileRequest, UpdateAuthenticatedUserProfileResponse } from "./types.gen.js";

export interface AuthApi {
  acceptUserInvite(input: AcceptUserInviteRequest, options?: SdkRequestOverrides): Promise<AcceptUserInviteResponse>;
  beginLoginMfaEnrollment(input: BeginLoginMfaEnrollmentRequest, options?: SdkRequestOverrides): Promise<BeginLoginMfaEnrollmentResponse>;
  beginMfaEnrollment(options?: SdkRequestOverrides): Promise<BeginMfaEnrollmentResponse>;
  changeAuthenticatedUserPassword(input: ChangeAuthenticatedUserPasswordRequest, options?: SdkRequestOverrides): Promise<ChangeAuthenticatedUserPasswordResponse>;
  completeLoginMfaEnrollment(input: CompleteLoginMfaEnrollmentRequest, options?: SdkRequestOverrides): Promise<CompleteLoginMfaEnrollmentResponse>;
  completeMfaLogin(input: CompleteMfaLoginRequest, options?: SdkRequestOverrides): Promise<CompleteMfaLoginResponse>;
  completePasswordReset(input: CompletePasswordResetRequest, options?: SdkRequestOverrides): Promise<CompletePasswordResetResponse>;
  confirmEmailVerification(input: ConfirmEmailVerificationRequest, options?: SdkRequestOverrides): Promise<ConfirmEmailVerificationResponse>;
  confirmMfaEnrollment(input: ConfirmMfaEnrollmentRequest, options?: SdkRequestOverrides): Promise<ConfirmMfaEnrollmentResponse>;
  disableMfa(input: DisableMfaRequest, options?: SdkRequestOverrides): Promise<DisableMfaResponse>;
  getAuthenticatedUser(options?: SdkRequestOverrides): Promise<GetAuthenticatedUserResponse>;
  getMfaStatus(options?: SdkRequestOverrides): Promise<GetMfaStatusResponse>;
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
    beginLoginMfaEnrollment: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/auth/login/mfa/enrollment",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    beginMfaEnrollment: async (options) =>
      client.request({
        method: "POST",
        path: "/v1/auth/mfa/enrollment",
        pathParams: undefined,
        query: undefined,
        body: undefined,
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
    completeLoginMfaEnrollment: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/auth/login/mfa/enrollment/confirm",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    completeMfaLogin: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/auth/login/mfa",
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
    confirmMfaEnrollment: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/auth/mfa/enrollment/confirm",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    disableMfa: async (input, options) =>
      client.request({
        method: "DELETE",
        path: "/v1/auth/mfa",
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
    getMfaStatus: async (options) =>
      client.request({
        method: "GET",
        path: "/v1/auth/mfa",
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
