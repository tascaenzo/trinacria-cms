/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { ExportPluginSettingsRequest, ExportPluginSettingsResponse, GetSettingDefinitionByKeyRequest, GetSettingDefinitionByKeyResponse, GetSettingSecretMetadataRequest, GetSettingSecretMetadataResponse, GetSettingsGroupByIdRequest, GetSettingsGroupByIdResponse, GetSettingsObservabilityRequest, GetSettingsObservabilityResponse, GetSettingValueByKeyRequest, GetSettingValueByKeyResponse, ListSettingDefinitionsRequest, ListSettingDefinitionsResponse, ListSettingsGroupsRequest, ListSettingsGroupsResponse, RevealSettingSecretRequest, RevealSettingSecretResponse, UpsertSettingDefinitionRequest, UpsertSettingDefinitionResponse, UpsertSettingSecretRequest, UpsertSettingSecretResponse, UpsertSettingsGroupValuesRequest, UpsertSettingsGroupValuesResponse, UpsertSettingValueRequest, UpsertSettingValueResponse } from "./types.gen.js";

export interface SettingsApi {
  exportPluginSettings(input: ExportPluginSettingsRequest, options?: SdkRequestOverrides): Promise<ExportPluginSettingsResponse>;
  getSettingDefinitionByKey(input: GetSettingDefinitionByKeyRequest, options?: SdkRequestOverrides): Promise<GetSettingDefinitionByKeyResponse>;
  getSettingSecretMetadata(input: GetSettingSecretMetadataRequest, options?: SdkRequestOverrides): Promise<GetSettingSecretMetadataResponse>;
  getSettingsGroupById(input: GetSettingsGroupByIdRequest, options?: SdkRequestOverrides): Promise<GetSettingsGroupByIdResponse>;
  getSettingsObservability(options?: SdkRequestOverrides): Promise<GetSettingsObservabilityResponse>;
  getSettingValueByKey(input: GetSettingValueByKeyRequest, options?: SdkRequestOverrides): Promise<GetSettingValueByKeyResponse>;
  listSettingDefinitions(input: ListSettingDefinitionsRequest, options?: SdkRequestOverrides): Promise<ListSettingDefinitionsResponse>;
  listSettingsGroups(options?: SdkRequestOverrides): Promise<ListSettingsGroupsResponse>;
  revealSettingSecret(input: RevealSettingSecretRequest, options?: SdkRequestOverrides): Promise<RevealSettingSecretResponse>;
  upsertSettingDefinition(input: UpsertSettingDefinitionRequest, options?: SdkRequestOverrides): Promise<UpsertSettingDefinitionResponse>;
  upsertSettingSecret(input: UpsertSettingSecretRequest, options?: SdkRequestOverrides): Promise<UpsertSettingSecretResponse>;
  upsertSettingsGroupValues(input: UpsertSettingsGroupValuesRequest, options?: SdkRequestOverrides): Promise<UpsertSettingsGroupValuesResponse>;
  upsertSettingValue(input: UpsertSettingValueRequest, options?: SdkRequestOverrides): Promise<UpsertSettingValueResponse>;
}

export function createSettingsApi(client: CmsSdkClientCore): SettingsApi {
  return {
    exportPluginSettings: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/settings/export/:pluginId",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getSettingDefinitionByKey: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/settings/definitions/:key",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getSettingSecretMetadata: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/settings/secrets/:key",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getSettingsGroupById: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/settings/groups/:groupId",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getSettingsObservability: async (options) =>
      client.request({
        method: "GET",
        path: "/v1/settings/observability",
        pathParams: undefined,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getSettingValueByKey: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/settings/values/:key",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listSettingDefinitions: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/settings/definitions",
        pathParams: undefined,
        query: input.query,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listSettingsGroups: async (options) =>
      client.request({
        method: "GET",
        path: "/v1/settings/groups",
        pathParams: undefined,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    revealSettingSecret: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/settings/secrets/:key/reveal",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    upsertSettingDefinition: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/settings/definitions",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    upsertSettingSecret: async (input, options) =>
      client.request({
        method: "PUT",
        path: "/v1/settings/secrets/:key",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    upsertSettingsGroupValues: async (input, options) =>
      client.request({
        method: "PATCH",
        path: "/v1/settings/groups/:groupId",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    upsertSettingValue: async (input, options) =>
      client.request({
        method: "PUT",
        path: "/v1/settings/values/:key",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      })
  };
}
