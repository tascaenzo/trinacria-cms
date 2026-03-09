/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { GetKernelDependencyGraphRequest, GetKernelDependencyGraphResponse, GetKernelHealthRequest, GetKernelHealthResponse } from "./types.gen.js";

export interface KernelHealthApi {
  getKernelDependencyGraph(options?: SdkRequestOverrides): Promise<GetKernelDependencyGraphResponse>;
  getKernelHealth(options?: SdkRequestOverrides): Promise<GetKernelHealthResponse>;
}

export function createKernelHealthApi(client: CmsSdkClientCore): KernelHealthApi {
  return {
    getKernelDependencyGraph: async (options) =>
      client.request({
        method: "GET",
        path: "/health/dependencies",
        pathParams: undefined,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getKernelHealth: async (options) =>
      client.request({
        method: "GET",
        path: "/health",
        pathParams: undefined,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      })
  };
}
