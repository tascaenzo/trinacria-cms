/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { ApproveEditorialEntryRequest, ApproveEditorialEntryResponse, CreateEditorialContentTypeRequest, CreateEditorialContentTypeResponse, CreateEditorialEntryRequest, CreateEditorialEntryResponse, CreateEditorialEntryRevisionRequest, CreateEditorialEntryRevisionResponse, DeleteEditorialContentTypeRequest, DeleteEditorialContentTypeResponse, DeleteEditorialEntryRequest, DeleteEditorialEntryResponse, GetEditorialContentTypeRequest, GetEditorialContentTypeResponse, GetEditorialEntryRequest, GetEditorialEntryResponse, ListDeletedEditorialContentTypesRequest, ListDeletedEditorialContentTypesResponse, ListEditorialContentTypesRequest, ListEditorialContentTypesResponse, ListEditorialEntriesRequest, ListEditorialEntriesResponse, ListEditorialEntryRevisionsRequest, ListEditorialEntryRevisionsResponse, PermanentlyDeleteEditorialContentTypeRequest, PermanentlyDeleteEditorialContentTypeResponse, PublishEditorialEntryRequest, PublishEditorialEntryResponse, PublishEditorialEntrySnapshotRequest, PublishEditorialEntrySnapshotResponse, RequestEditorialEntryChangesRequest, RequestEditorialEntryChangesResponse, RestoreEditorialContentTypeRequest, RestoreEditorialContentTypeResponse, RestoreEditorialEntryRevisionRequest, RestoreEditorialEntryRevisionResponse, SubmitEditorialEntryRequest, SubmitEditorialEntryResponse, TransitionEditorialEntryRequest, TransitionEditorialEntryResponse, UnpublishEditorialEntryRequest, UnpublishEditorialEntryResponse, UpdateEditorialContentTypeRequest, UpdateEditorialContentTypeResponse, UpdateEditorialEntryRequest, UpdateEditorialEntryResponse } from "./types.gen.js";

export interface EditorialApi {
  approveEditorialEntry(input: ApproveEditorialEntryRequest, options?: SdkRequestOverrides): Promise<ApproveEditorialEntryResponse>;
  createEditorialContentType(input: CreateEditorialContentTypeRequest, options?: SdkRequestOverrides): Promise<CreateEditorialContentTypeResponse>;
  createEditorialEntry(input: CreateEditorialEntryRequest, options?: SdkRequestOverrides): Promise<CreateEditorialEntryResponse>;
  createEditorialEntryRevision(input: CreateEditorialEntryRevisionRequest, options?: SdkRequestOverrides): Promise<CreateEditorialEntryRevisionResponse>;
  deleteEditorialContentType(input: DeleteEditorialContentTypeRequest, options?: SdkRequestOverrides): Promise<DeleteEditorialContentTypeResponse>;
  deleteEditorialEntry(input: DeleteEditorialEntryRequest, options?: SdkRequestOverrides): Promise<DeleteEditorialEntryResponse>;
  getEditorialContentType(input: GetEditorialContentTypeRequest, options?: SdkRequestOverrides): Promise<GetEditorialContentTypeResponse>;
  getEditorialEntry(input: GetEditorialEntryRequest, options?: SdkRequestOverrides): Promise<GetEditorialEntryResponse>;
  listDeletedEditorialContentTypes(input?: ListDeletedEditorialContentTypesRequest, options?: SdkRequestOverrides): Promise<ListDeletedEditorialContentTypesResponse>;
  listEditorialContentTypes(input?: ListEditorialContentTypesRequest, options?: SdkRequestOverrides): Promise<ListEditorialContentTypesResponse>;
  listEditorialEntries(input?: ListEditorialEntriesRequest, options?: SdkRequestOverrides): Promise<ListEditorialEntriesResponse>;
  listEditorialEntryRevisions(input: ListEditorialEntryRevisionsRequest, options?: SdkRequestOverrides): Promise<ListEditorialEntryRevisionsResponse>;
  permanentlyDeleteEditorialContentType(input: PermanentlyDeleteEditorialContentTypeRequest, options?: SdkRequestOverrides): Promise<PermanentlyDeleteEditorialContentTypeResponse>;
  publishEditorialEntry(input: PublishEditorialEntryRequest, options?: SdkRequestOverrides): Promise<PublishEditorialEntryResponse>;
  publishEditorialEntrySnapshot(input: PublishEditorialEntrySnapshotRequest, options?: SdkRequestOverrides): Promise<PublishEditorialEntrySnapshotResponse>;
  requestEditorialEntryChanges(input: RequestEditorialEntryChangesRequest, options?: SdkRequestOverrides): Promise<RequestEditorialEntryChangesResponse>;
  restoreEditorialContentType(input: RestoreEditorialContentTypeRequest, options?: SdkRequestOverrides): Promise<RestoreEditorialContentTypeResponse>;
  restoreEditorialEntryRevision(input: RestoreEditorialEntryRevisionRequest, options?: SdkRequestOverrides): Promise<RestoreEditorialEntryRevisionResponse>;
  submitEditorialEntry(input: SubmitEditorialEntryRequest, options?: SdkRequestOverrides): Promise<SubmitEditorialEntryResponse>;
  transitionEditorialEntry(input: TransitionEditorialEntryRequest, options?: SdkRequestOverrides): Promise<TransitionEditorialEntryResponse>;
  unpublishEditorialEntry(input: UnpublishEditorialEntryRequest, options?: SdkRequestOverrides): Promise<UnpublishEditorialEntryResponse>;
  updateEditorialContentType(input: UpdateEditorialContentTypeRequest, options?: SdkRequestOverrides): Promise<UpdateEditorialContentTypeResponse>;
  updateEditorialEntry(input: UpdateEditorialEntryRequest, options?: SdkRequestOverrides): Promise<UpdateEditorialEntryResponse>;
}

export function createEditorialApi(client: CmsSdkClientCore): EditorialApi {
  return {
    approveEditorialEntry: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/editorial/entries/:id/approve",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    createEditorialContentType: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/editorial/content-types",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    createEditorialEntry: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/editorial/entries",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    createEditorialEntryRevision: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/editorial/entries/:id/revisions",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    deleteEditorialContentType: async (input, options) =>
      client.request({
        method: "DELETE",
        path: "/v1/editorial/content-types/:id",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    deleteEditorialEntry: async (input, options) =>
      client.request({
        method: "DELETE",
        path: "/v1/editorial/entries/:id",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getEditorialContentType: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/editorial/content-types/:id",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getEditorialEntry: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/editorial/entries/:id",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listDeletedEditorialContentTypes: async (input = {}, options) =>
      client.request({
        method: "GET",
        path: "/v1/editorial/content-types/deleted",
        pathParams: undefined,
        query: input.query,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listEditorialContentTypes: async (input = {}, options) =>
      client.request({
        method: "GET",
        path: "/v1/editorial/content-types",
        pathParams: undefined,
        query: input.query,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listEditorialEntries: async (input = {}, options) =>
      client.request({
        method: "GET",
        path: "/v1/editorial/entries",
        pathParams: undefined,
        query: input.query,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listEditorialEntryRevisions: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/editorial/entries/:id/revisions",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    permanentlyDeleteEditorialContentType: async (input, options) =>
      client.request({
        method: "DELETE",
        path: "/v1/editorial/content-types/:id/permanent",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    publishEditorialEntry: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/editorial/entries/:id/publish",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    publishEditorialEntrySnapshot: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/editorial/entries/:id/publication",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    requestEditorialEntryChanges: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/editorial/entries/:id/request-changes",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    restoreEditorialContentType: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/editorial/content-types/:id/restore",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    restoreEditorialEntryRevision: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/editorial/entries/:id/revisions/:revisionId/restore",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    submitEditorialEntry: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/editorial/entries/:id/submit",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    transitionEditorialEntry: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/editorial/entries/:id/transition",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    unpublishEditorialEntry: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/editorial/entries/:id/unpublish",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    updateEditorialContentType: async (input, options) =>
      client.request({
        method: "PATCH",
        path: "/v1/editorial/content-types/:id",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    updateEditorialEntry: async (input, options) =>
      client.request({
        method: "PATCH",
        path: "/v1/editorial/entries/:id",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      })
  };
}
