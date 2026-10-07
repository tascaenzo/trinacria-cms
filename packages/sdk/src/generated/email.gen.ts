/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { ListEmailTemplatesRequest, ListEmailTemplatesResponse, PreviewEmailTemplateRequest, PreviewEmailTemplateResponse, UpsertEmailTemplateRequest, UpsertEmailTemplateResponse } from "./types.gen.js";

export interface EmailApi {
  listEmailTemplates(input?: ListEmailTemplatesRequest, options?: SdkRequestOverrides): Promise<ListEmailTemplatesResponse>;
  previewEmailTemplate(input: PreviewEmailTemplateRequest, options?: SdkRequestOverrides): Promise<PreviewEmailTemplateResponse>;
  upsertEmailTemplate(input: UpsertEmailTemplateRequest, options?: SdkRequestOverrides): Promise<UpsertEmailTemplateResponse>;
}

export function createEmailApi(client: CmsSdkClientCore): EmailApi {
  return {
    listEmailTemplates: async (input = {}, options) =>
      client.request({
        method: "GET",
        path: "/v1/email/templates",
        pathParams: undefined,
        query: input.query,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    previewEmailTemplate: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/email/templates/preview",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    upsertEmailTemplate: async (input, options) =>
      client.request({
        method: "PUT",
        path: "/v1/email/templates",
        pathParams: undefined,
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
