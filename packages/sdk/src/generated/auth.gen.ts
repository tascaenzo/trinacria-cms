/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { GetAuthenticatedUserRequest, GetAuthenticatedUserResponse, LoginWithPasswordRequest, LoginWithPasswordResponse, LogoutSessionRequest, LogoutSessionResponse } from "./types.gen.js";

export interface AuthApi {
  getAuthenticatedUser(options?: SdkRequestOverrides): Promise<GetAuthenticatedUserResponse>;
  loginWithPassword(input: LoginWithPasswordRequest, options?: SdkRequestOverrides): Promise<LoginWithPasswordResponse>;
  logoutSession(options?: SdkRequestOverrides): Promise<LogoutSessionResponse>;
}

export function createAuthApi(client: CmsSdkClientCore): AuthApi {
  return {
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
      })
  };
}
