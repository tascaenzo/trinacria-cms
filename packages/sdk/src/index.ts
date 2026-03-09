import { createGeneratedCmsSdk } from "./generated/index.js";
import * as official from "./official/index.js";
import { createCmsSdkClientCore } from "./runtime/client.js";
import type { CmsSdkClientOptions } from "./runtime/types.js";

export * from "./generated/index.js";
export * from "./official/index.js";
export * from "./runtime/index.js";

/**
 * Public SDK factory. It combines the low-level client runtime with
 * generated operation groups derived from OpenAPI.
 */
export function createCmsSdkClient(options: CmsSdkClientOptions) {
  const core = createCmsSdkClientCore(options);
  return Object.assign(core, createGeneratedCmsSdk(core), {
    official,
  });
}
