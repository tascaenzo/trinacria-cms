/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { ListInstalledCapabilitiesRequest, ListInstalledCapabilitiesResponse, ListInstalledPluginsRequest, ListInstalledPluginsResponse } from "./types.gen.js";

export interface SystemApi {
  listInstalledCapabilities(options?: SdkRequestOverrides): Promise<ListInstalledCapabilitiesResponse>;
  listInstalledPlugins(options?: SdkRequestOverrides): Promise<ListInstalledPluginsResponse>;
}

export function createSystemApi(client: CmsSdkClientCore): SystemApi {
  return {
    listInstalledCapabilities: async (options) =>
      client.request({
        method: "GET",
        path: "/v1/system/capabilities",
        pathParams: undefined,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listInstalledPlugins: async (options) =>
      client.request({
        method: "GET",
        path: "/v1/system/plugins",
        pathParams: undefined,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      })
  };
}
