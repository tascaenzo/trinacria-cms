import {
  type ErrorEnvelope,
  type SchemaParser,
  type SuccessEnvelope,
  errorEnvelope,
  parseWithSchema,
  successEnvelope
} from "@trinacria-cms/kernel/plugin-api";
import {
  type BuildPluginAuthHeadersInput,
  type BuildPluginSignatureInput,
  PLUGIN_AUTH_HEADERS,
  buildBodyHash,
  buildPluginAuthHeaders,
  buildPluginRequestSignature,
  normalizePath
} from "../modules/settings/auth/plugin-auth.js";

export {
  type ErrorEnvelope,
  type SchemaParser,
  type SuccessEnvelope,
  type BuildPluginAuthHeadersInput,
  type BuildPluginSignatureInput,
  PLUGIN_AUTH_HEADERS,
  buildBodyHash,
  buildPluginAuthHeaders,
  buildPluginRequestSignature,
  errorEnvelope,
  parseWithSchema,
  successEnvelope,
  normalizePath
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
