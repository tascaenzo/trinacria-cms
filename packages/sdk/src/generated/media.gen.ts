/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { CompleteMediaUploadRequest, CompleteMediaUploadResponse, CreateMediaAccessUrlRequest, CreateMediaAccessUrlResponse, CreateMediaDirectoryRequest, CreateMediaDirectoryResponse, DeleteMediaAssetRequest, DeleteMediaAssetResponse, DeleteMediaAssetShareRequest, DeleteMediaAssetShareResponse, DeleteMediaDirectoryRequest, DeleteMediaDirectoryResponse, DeleteMediaDirectoryShareRequest, DeleteMediaDirectoryShareResponse, DeliverLocalMediaAssetRequest, DeliverLocalMediaAssetResponse, GetMediaAssetRequest, GetMediaAssetResponse, GetMediaProviderHealthRequest, GetMediaProviderHealthResponse, ListMediaAssetsRequest, ListMediaAssetsResponse, ListMediaAssetSharesRequest, ListMediaAssetSharesResponse, ListMediaDirectoriesRequest, ListMediaDirectoriesResponse, ListMediaDirectorySharesRequest, ListMediaDirectorySharesResponse, ReceiveMediaUploadContentRequest, ReceiveMediaUploadContentResponse, ReplaceMediaAssetSharesRequest, ReplaceMediaAssetSharesResponse, ReplaceMediaDirectorySharesRequest, ReplaceMediaDirectorySharesResponse, StartMediaUploadRequest, StartMediaUploadResponse, UpdateMediaAssetRequest, UpdateMediaAssetResponse, UpdateMediaDirectoryRequest, UpdateMediaDirectoryResponse } from "./types.gen.js";

export interface MediaApi {
  completeMediaUpload(input: CompleteMediaUploadRequest, options?: SdkRequestOverrides): Promise<CompleteMediaUploadResponse>;
  createMediaAccessUrl(input: CreateMediaAccessUrlRequest, options?: SdkRequestOverrides): Promise<CreateMediaAccessUrlResponse>;
  createMediaDirectory(input: CreateMediaDirectoryRequest, options?: SdkRequestOverrides): Promise<CreateMediaDirectoryResponse>;
  deleteMediaAsset(input: DeleteMediaAssetRequest, options?: SdkRequestOverrides): Promise<DeleteMediaAssetResponse>;
  deleteMediaAssetShare(input: DeleteMediaAssetShareRequest, options?: SdkRequestOverrides): Promise<DeleteMediaAssetShareResponse>;
  deleteMediaDirectory(input: DeleteMediaDirectoryRequest, options?: SdkRequestOverrides): Promise<DeleteMediaDirectoryResponse>;
  deleteMediaDirectoryShare(input: DeleteMediaDirectoryShareRequest, options?: SdkRequestOverrides): Promise<DeleteMediaDirectoryShareResponse>;
  deliverLocalMediaAsset(input: DeliverLocalMediaAssetRequest, options?: SdkRequestOverrides): Promise<DeliverLocalMediaAssetResponse>;
  getMediaAsset(input: GetMediaAssetRequest, options?: SdkRequestOverrides): Promise<GetMediaAssetResponse>;
  getMediaProviderHealth(options?: SdkRequestOverrides): Promise<GetMediaProviderHealthResponse>;
  listMediaAssets(options?: SdkRequestOverrides): Promise<ListMediaAssetsResponse>;
  listMediaAssetShares(input: ListMediaAssetSharesRequest, options?: SdkRequestOverrides): Promise<ListMediaAssetSharesResponse>;
  listMediaDirectories(options?: SdkRequestOverrides): Promise<ListMediaDirectoriesResponse>;
  listMediaDirectoryShares(input: ListMediaDirectorySharesRequest, options?: SdkRequestOverrides): Promise<ListMediaDirectorySharesResponse>;
  receiveMediaUploadContent(input: ReceiveMediaUploadContentRequest, options?: SdkRequestOverrides): Promise<ReceiveMediaUploadContentResponse>;
  replaceMediaAssetShares(input: ReplaceMediaAssetSharesRequest, options?: SdkRequestOverrides): Promise<ReplaceMediaAssetSharesResponse>;
  replaceMediaDirectoryShares(input: ReplaceMediaDirectorySharesRequest, options?: SdkRequestOverrides): Promise<ReplaceMediaDirectorySharesResponse>;
  startMediaUpload(input: StartMediaUploadRequest, options?: SdkRequestOverrides): Promise<StartMediaUploadResponse>;
  updateMediaAsset(input: UpdateMediaAssetRequest, options?: SdkRequestOverrides): Promise<UpdateMediaAssetResponse>;
  updateMediaDirectory(input: UpdateMediaDirectoryRequest, options?: SdkRequestOverrides): Promise<UpdateMediaDirectoryResponse>;
}

export function createMediaApi(client: CmsSdkClientCore): MediaApi {
  return {
    completeMediaUpload: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/media/uploads/:id/complete",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    createMediaAccessUrl: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/media/assets/:id/access-url",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    createMediaDirectory: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/media/directories",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    deleteMediaAsset: async (input, options) =>
      client.request({
        method: "DELETE",
        path: "/v1/media/assets/:id",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    deleteMediaAssetShare: async (input, options) =>
      client.request({
        method: "DELETE",
        path: "/v1/media/assets/:id/shares/:shareId",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    deleteMediaDirectory: async (input, options) =>
      client.request({
        method: "DELETE",
        path: "/v1/media/directories/:id",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    deleteMediaDirectoryShare: async (input, options) =>
      client.request({
        method: "DELETE",
        path: "/v1/media/directories/:id/shares/:shareId",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    deliverLocalMediaAsset: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/media/local/:storageKey",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getMediaAsset: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/media/assets/:id",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getMediaProviderHealth: async (options) =>
      client.request({
        method: "GET",
        path: "/v1/media/providers/health",
        pathParams: undefined,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listMediaAssets: async (options) =>
      client.request({
        method: "GET",
        path: "/v1/media/assets",
        pathParams: undefined,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listMediaAssetShares: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/media/assets/:id/shares",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listMediaDirectories: async (options) =>
      client.request({
        method: "GET",
        path: "/v1/media/directories",
        pathParams: undefined,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listMediaDirectoryShares: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/media/directories/:id/shares",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    receiveMediaUploadContent: async (input, options) =>
      client.request({
        method: "PUT",
        path: "/v1/media/uploads/:id/content",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    replaceMediaAssetShares: async (input, options) =>
      client.request({
        method: "PUT",
        path: "/v1/media/assets/:id/shares",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    replaceMediaDirectoryShares: async (input, options) =>
      client.request({
        method: "PUT",
        path: "/v1/media/directories/:id/shares",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    startMediaUpload: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/media/uploads",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    updateMediaAsset: async (input, options) =>
      client.request({
        method: "PATCH",
        path: "/v1/media/assets/:id",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    updateMediaDirectory: async (input, options) =>
      client.request({
        method: "PATCH",
        path: "/v1/media/directories/:id",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      })
  };
}
