/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { BootstrapInstallationRequest, BootstrapInstallationResponse, GetInstallationStatusRequest, GetInstallationStatusResponse } from "./types.gen.js";

export interface InstallationApi {
  bootstrapInstallation(input: BootstrapInstallationRequest, options?: SdkRequestOverrides): Promise<BootstrapInstallationResponse>;
  getInstallationStatus(options?: SdkRequestOverrides): Promise<GetInstallationStatusResponse>;
}

export function createInstallationApi(client: CmsSdkClientCore): InstallationApi {
  return {
    bootstrapInstallation: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/install/bootstrap",
        pathParams: undefined,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getInstallationStatus: async (options) =>
      client.request({
        method: "GET",
        path: "/v1/install/status",
        pathParams: undefined,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      })
  };
}
