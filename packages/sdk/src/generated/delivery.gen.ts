/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { GetPublicMediaContentRequest, GetPublicMediaContentResponse, GetPublicNavigationRequest, GetPublicNavigationResponse, GetPublishedEntryRequest, GetPublishedEntryResponse, ListPublishedEntriesRequest, ListPublishedEntriesResponse } from "./types.gen.js";

export interface DeliveryApi {
  getPublicMediaContent(input: GetPublicMediaContentRequest, options?: SdkRequestOverrides): Promise<GetPublicMediaContentResponse>;
  getPublicNavigation(options?: SdkRequestOverrides): Promise<GetPublicNavigationResponse>;
  getPublishedEntry(input: GetPublishedEntryRequest, options?: SdkRequestOverrides): Promise<GetPublishedEntryResponse>;
  listPublishedEntries(input: ListPublishedEntriesRequest, options?: SdkRequestOverrides): Promise<ListPublishedEntriesResponse>;
}

export function createDeliveryApi(client: CmsSdkClientCore): DeliveryApi {
  return {
    getPublicMediaContent: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/delivery/media/:id",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "binary",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getPublicNavigation: async (options) =>
      client.request({
        method: "GET",
        path: "/v1/delivery/navigation",
        pathParams: undefined,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getPublishedEntry: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/delivery/content-types/:key/entries/:slug",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listPublishedEntries: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/delivery/content-types/:key/entries",
        pathParams: input.path,
        query: input.query,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      })
  };
}
