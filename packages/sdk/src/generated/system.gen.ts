/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { ExecutePluginOperationRequest, ExecutePluginOperationResponse, GetInstalledPluginRequest, GetInstalledPluginResponse, ListInstalledCapabilitiesRequest, ListInstalledCapabilitiesResponse, ListInstalledPluginsRequest, ListInstalledPluginsResponse, ListPluginContributionsRequest, ListPluginContributionsResponse, ListPluginEventsRequest, ListPluginEventsResponse } from "./types.gen.js";

export interface SystemApi {
  executePluginOperation(input: ExecutePluginOperationRequest, options?: SdkRequestOverrides): Promise<ExecutePluginOperationResponse>;
  getInstalledPlugin(input: GetInstalledPluginRequest, options?: SdkRequestOverrides): Promise<GetInstalledPluginResponse>;
  listInstalledCapabilities(options?: SdkRequestOverrides): Promise<ListInstalledCapabilitiesResponse>;
  listInstalledPlugins(options?: SdkRequestOverrides): Promise<ListInstalledPluginsResponse>;
  listPluginContributions(options?: SdkRequestOverrides): Promise<ListPluginContributionsResponse>;
  listPluginEvents(input: ListPluginEventsRequest, options?: SdkRequestOverrides): Promise<ListPluginEventsResponse>;
}

export function createSystemApi(client: CmsSdkClientCore): SystemApi {
  return {
    executePluginOperation: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/system/plugins/:pluginId/operations",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getInstalledPlugin: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/system/plugins/:pluginId",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
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
      }),
    listPluginContributions: async (options) =>
      client.request({
        method: "GET",
        path: "/v1/system/plugin-contributions",
        pathParams: undefined,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listPluginEvents: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/system/plugins/:pluginId/events",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      })
  };
}
