/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { CreateRoleRequest, CreateRoleResponse, GetRoleByIdRequest, GetRoleByIdResponse, ListRolesRequest, ListRolesResponse, UpdateRoleRequest, UpdateRoleResponse, UpdateRoleStatusRequest, UpdateRoleStatusResponse } from "./types.gen.js";

export interface RolesApi {
  createRole(input: CreateRoleRequest, options?: SdkRequestOverrides): Promise<CreateRoleResponse>;
  getRoleById(input: GetRoleByIdRequest, options?: SdkRequestOverrides): Promise<GetRoleByIdResponse>;
  listRoles(input: ListRolesRequest, options?: SdkRequestOverrides): Promise<ListRolesResponse>;
  updateRole(input: UpdateRoleRequest, options?: SdkRequestOverrides): Promise<UpdateRoleResponse>;
  updateRoleStatus(input: UpdateRoleStatusRequest, options?: SdkRequestOverrides): Promise<UpdateRoleStatusResponse>;
}

export function createRolesApi(client: CmsSdkClientCore): RolesApi {
  return {
    createRole: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/roles",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getRoleById: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/roles/:id",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listRoles: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/roles",
        pathParams: undefined,
        query: input.query,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    updateRole: async (input, options) =>
      client.request({
        method: "PATCH",
        path: "/v1/roles/:id",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    updateRoleStatus: async (input, options) =>
      client.request({
        method: "PATCH",
        path: "/v1/roles/:id/status",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      })
  };
}
