import {
  type ErrorEnvelope,
  errorEnvelope,
  parseWithSchema,
  type SchemaParser,
  type SuccessEnvelope,
  successEnvelope
} from "@trinacria-cms/kernel/plugin-api";
import {
  type BuildPluginAuthHeadersInput,
  type BuildPluginSignatureInput,
  buildBodyHash,
  buildPluginAuthHeaders,
  buildPluginRequestSignature,
  normalizePath,
  PLUGIN_AUTH_HEADERS
} from "../modules/settings/auth/plugin-auth.js";

export {
  type BuildPluginAuthHeadersInput,
  type BuildPluginSignatureInput,
  buildBodyHash,
  buildPluginAuthHeaders,
  buildPluginRequestSignature,
  type ErrorEnvelope,
  errorEnvelope,
  normalizePath,
  PLUGIN_AUTH_HEADERS,
  parseWithSchema,
  type SchemaParser,
  type SuccessEnvelope,
  successEnvelope
};

export interface SignedPluginRequestInput extends BuildPluginAuthHeadersInput {
  headers?: Record<string, string>;
}

export interface SignedPluginRequest {
  method: string;
  path: string;
  body: unknown;
  headers: Record<string, string>;
}

export function createSignedPluginRequest(input: SignedPluginRequestInput): SignedPluginRequest {
  return {
    method: input.method.trim().toUpperCase(),
    path: normalizePath(input.path),
    body: input.body,
    headers: {
      ...input.headers,
      ...buildPluginAuthHeaders(input)
    }
  };
}
