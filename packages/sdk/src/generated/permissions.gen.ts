/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { CreatePermissionRequest, CreatePermissionResponse, GetPermissionByIdRequest, GetPermissionByIdResponse, ListPermissionsRequest, ListPermissionsResponse, UpdatePermissionStatusRequest, UpdatePermissionStatusResponse } from "./types.gen.js";

export interface PermissionsApi {
  createPermission(input: CreatePermissionRequest, options?: SdkRequestOverrides): Promise<CreatePermissionResponse>;
  getPermissionById(input: GetPermissionByIdRequest, options?: SdkRequestOverrides): Promise<GetPermissionByIdResponse>;
  listPermissions(input: ListPermissionsRequest, options?: SdkRequestOverrides): Promise<ListPermissionsResponse>;
  updatePermissionStatus(input: UpdatePermissionStatusRequest, options?: SdkRequestOverrides): Promise<UpdatePermissionStatusResponse>;
}

export function createPermissionsApi(client: CmsSdkClientCore): PermissionsApi {
  return {
    createPermission: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/permissions",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getPermissionById: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/permissions/:id",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listPermissions: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/permissions",
        pathParams: undefined,
        query: input.query,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    updatePermissionStatus: async (input, options) =>
      client.request({
        method: "PATCH",
        path: "/v1/permissions/:id/status",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      })
  };
}
