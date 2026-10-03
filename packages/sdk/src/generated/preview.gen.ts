/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { CreateEditorialPreviewTokenRequest, CreateEditorialPreviewTokenResponse, CreatePreviewSessionRequest, CreatePreviewSessionResponse, GetPreviewEntryRequest, GetPreviewEntryResponse, ListEditorialPreviewSitesRequest, ListEditorialPreviewSitesResponse, RevokePreviewSessionRequest, RevokePreviewSessionResponse } from "./types.gen.js";

export interface PreviewApi {
  createEditorialPreviewToken(input: CreateEditorialPreviewTokenRequest, options?: SdkRequestOverrides): Promise<CreateEditorialPreviewTokenResponse>;
  createPreviewSession(input: CreatePreviewSessionRequest, options?: SdkRequestOverrides): Promise<CreatePreviewSessionResponse>;
  getPreviewEntry(input: GetPreviewEntryRequest, options?: SdkRequestOverrides): Promise<GetPreviewEntryResponse>;
  listEditorialPreviewSites(options?: SdkRequestOverrides): Promise<ListEditorialPreviewSitesResponse>;
  revokePreviewSession(options?: SdkRequestOverrides): Promise<RevokePreviewSessionResponse>;
}

export function createPreviewApi(client: CmsSdkClientCore): PreviewApi {
  return {
    createEditorialPreviewToken: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/editorial/entries/:id/preview-tokens",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    createPreviewSession: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/preview/sessions",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getPreviewEntry: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/preview/entries/:id",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listEditorialPreviewSites: async (options) =>
      client.request({
        method: "GET",
        path: "/v1/editorial/preview-sites",
        pathParams: undefined,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    revokePreviewSession: async (options) =>
      client.request({
        method: "DELETE",
        path: "/v1/preview/sessions/current",
        pathParams: undefined,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      })
  };
}
