/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { CreateApiKeyRequest, CreateApiKeyResponse, GetApiKeyByIdRequest, GetApiKeyByIdResponse, ListApiKeysRequest, ListApiKeysResponse, RevokeApiKeyRequest, RevokeApiKeyResponse, RotateApiKeyRequest, RotateApiKeyResponse } from "./types.gen.js";

export interface ApiKeysApi {
  createApiKey(input: CreateApiKeyRequest, options?: SdkRequestOverrides): Promise<CreateApiKeyResponse>;
  getApiKeyById(input: GetApiKeyByIdRequest, options?: SdkRequestOverrides): Promise<GetApiKeyByIdResponse>;
  listApiKeys(input: ListApiKeysRequest, options?: SdkRequestOverrides): Promise<ListApiKeysResponse>;
  revokeApiKey(input: RevokeApiKeyRequest, options?: SdkRequestOverrides): Promise<RevokeApiKeyResponse>;
  rotateApiKey(input: RotateApiKeyRequest, options?: SdkRequestOverrides): Promise<RotateApiKeyResponse>;
}

export function createApiKeysApi(client: CmsSdkClientCore): ApiKeysApi {
  return {
    createApiKey: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/api-keys",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getApiKeyById: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/api-keys/:id",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listApiKeys: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/api-keys",
        pathParams: undefined,
        query: input.query,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    revokeApiKey: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/api-keys/:id/revoke",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    rotateApiKey: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/api-keys/:id/rotate",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      })
  };
}
