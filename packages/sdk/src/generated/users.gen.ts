/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { CreateUserRequest, CreateUserResponse, GetUserByIdRequest, GetUserByIdResponse, ListUsersRequest, ListUsersResponse, UpdateUserProfileRequest, UpdateUserProfileResponse, UpdateUserStatusRequest, UpdateUserStatusResponse } from "./types.gen.js";

export interface UsersApi {
  createUser(input: CreateUserRequest, options?: SdkRequestOverrides): Promise<CreateUserResponse>;
  getUserById(input: GetUserByIdRequest, options?: SdkRequestOverrides): Promise<GetUserByIdResponse>;
  listUsers(input: ListUsersRequest, options?: SdkRequestOverrides): Promise<ListUsersResponse>;
  updateUserProfile(input: UpdateUserProfileRequest, options?: SdkRequestOverrides): Promise<UpdateUserProfileResponse>;
  updateUserStatus(input: UpdateUserStatusRequest, options?: SdkRequestOverrides): Promise<UpdateUserStatusResponse>;
}

export function createUsersApi(client: CmsSdkClientCore): UsersApi {
  return {
    createUser: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/users",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getUserById: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/users/:id",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listUsers: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/users",
        pathParams: undefined,
        query: input.query,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    updateUserProfile: async (input, options) =>
      client.request({
        method: "PATCH",
        path: "/v1/users/:id",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    updateUserStatus: async (input, options) =>
      client.request({
        method: "PATCH",
        path: "/v1/users/:id/status",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      })
  };
}
