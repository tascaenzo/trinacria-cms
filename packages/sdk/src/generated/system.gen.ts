/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { CancelEventDeliveryRequest, CancelEventDeliveryResponse, CancelSecureEmailJobRequest, CancelSecureEmailJobResponse, ExecutePluginOperationRequest, ExecutePluginOperationResponse, GetEventDeliveryRequest, GetEventDeliveryResponse, GetInstalledPluginRequest, GetInstalledPluginResponse, GetPluginOperationRequest, GetPluginOperationResponse, GetSecureEmailJobRequest, GetSecureEmailJobResponse, ListAdminExtensionsRequest, ListAdminExtensionsResponse, ListEventDeliveriesRequest, ListEventDeliveriesResponse, ListInstalledCapabilitiesRequest, ListInstalledCapabilitiesResponse, ListInstalledPluginsRequest, ListInstalledPluginsResponse, ListPluginContributionsRequest, ListPluginContributionsResponse, ListPluginEventsRequest, ListPluginEventsResponse, ListPluginSourcesRequest, ListPluginSourcesResponse, ListSecureEmailJobsRequest, ListSecureEmailJobsResponse, RetryEventDeliveryRequest, RetryEventDeliveryResponse, RetrySecureEmailJobRequest, RetrySecureEmailJobResponse } from "./types.gen.js";

export interface SystemApi {
  cancelEventDelivery(input: CancelEventDeliveryRequest, options?: SdkRequestOverrides): Promise<CancelEventDeliveryResponse>;
  cancelSecureEmailJob(input: CancelSecureEmailJobRequest, options?: SdkRequestOverrides): Promise<CancelSecureEmailJobResponse>;
  executePluginOperation(input: ExecutePluginOperationRequest, options?: SdkRequestOverrides): Promise<ExecutePluginOperationResponse>;
  getEventDelivery(input: GetEventDeliveryRequest, options?: SdkRequestOverrides): Promise<GetEventDeliveryResponse>;
  getInstalledPlugin(input: GetInstalledPluginRequest, options?: SdkRequestOverrides): Promise<GetInstalledPluginResponse>;
  getPluginOperation(input: GetPluginOperationRequest, options?: SdkRequestOverrides): Promise<GetPluginOperationResponse>;
  getSecureEmailJob(input: GetSecureEmailJobRequest, options?: SdkRequestOverrides): Promise<GetSecureEmailJobResponse>;
  listAdminExtensions(options?: SdkRequestOverrides): Promise<ListAdminExtensionsResponse>;
  listEventDeliveries(input?: ListEventDeliveriesRequest, options?: SdkRequestOverrides): Promise<ListEventDeliveriesResponse>;
  listInstalledCapabilities(options?: SdkRequestOverrides): Promise<ListInstalledCapabilitiesResponse>;
  listInstalledPlugins(options?: SdkRequestOverrides): Promise<ListInstalledPluginsResponse>;
  listPluginContributions(options?: SdkRequestOverrides): Promise<ListPluginContributionsResponse>;
  listPluginEvents(input: ListPluginEventsRequest, options?: SdkRequestOverrides): Promise<ListPluginEventsResponse>;
  listPluginSources(options?: SdkRequestOverrides): Promise<ListPluginSourcesResponse>;
  listSecureEmailJobs(input?: ListSecureEmailJobsRequest, options?: SdkRequestOverrides): Promise<ListSecureEmailJobsResponse>;
  retryEventDelivery(input: RetryEventDeliveryRequest, options?: SdkRequestOverrides): Promise<RetryEventDeliveryResponse>;
  retrySecureEmailJob(input: RetrySecureEmailJobRequest, options?: SdkRequestOverrides): Promise<RetrySecureEmailJobResponse>;
}

export function createSystemApi(client: CmsSdkClientCore): SystemApi {
  return {
    cancelEventDelivery: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/system/deliveries/:deliveryId/cancel",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    cancelSecureEmailJob: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/system/email-jobs/:jobId/cancel",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    executePluginOperation: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/system/plugins/:pluginId/operations",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getEventDelivery: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/system/deliveries/:deliveryId",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
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
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getPluginOperation: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/system/plugin-operations/:operationId",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getSecureEmailJob: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/system/email-jobs/:jobId",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listAdminExtensions: async (options) =>
      client.request({
        method: "GET",
        path: "/v1/admin/extensions",
        pathParams: undefined,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listEventDeliveries: async (input = {}, options) =>
      client.request({
        method: "GET",
        path: "/v1/system/deliveries",
        pathParams: undefined,
        query: input.query,
        body: undefined,
        bodyType: "json",
        responseType: "json",
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
        bodyType: "json",
        responseType: "json",
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
        bodyType: "json",
        responseType: "json",
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
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listPluginEvents: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/system/plugins/:pluginId/events",
        pathParams: input.path,
        query: input.query,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listPluginSources: async (options) =>
      client.request({
        method: "GET",
        path: "/v1/system/plugins/sources",
        pathParams: undefined,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listSecureEmailJobs: async (input = {}, options) =>
      client.request({
        method: "GET",
        path: "/v1/system/email-jobs",
        pathParams: undefined,
        query: input.query,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    retryEventDelivery: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/system/deliveries/:deliveryId/retry",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    retrySecureEmailJob: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/system/email-jobs/:jobId/retry",
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
