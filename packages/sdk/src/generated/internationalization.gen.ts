/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { GetI18nBundleRequest, GetI18nBundleResponse } from "./types.gen.js";

export interface InternationalizationApi {
  getI18nBundle(input: GetI18nBundleRequest, options?: SdkRequestOverrides): Promise<GetI18nBundleResponse>;
}

export function createInternationalizationApi(client: CmsSdkClientCore): InternationalizationApi {
  return {
    getI18nBundle: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/i18n/:locale",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      })
  };
}
