import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  canonicalPluginJson,
  canonicalPluginSignatureMaterial,
  canonicalRequestTarget
} from "./plugin-auth-canonical.gen.js";

export { canonicalPluginJson, canonicalPluginSignatureMaterial, canonicalRequestTarget };
export interface BuildPluginSignatureInput {
  pluginId: string;
  keyId: string;
  secret: string;
  method: string;
  path: string;
  timestamp: number;
  nonce: string;
  body: unknown;
}
export interface BuildPluginAuthHeadersInput
  extends Omit<BuildPluginSignatureInput, "timestamp" | "nonce"> {
  timestamp?: number;
  nonce?: string;
}
export const PLUGIN_AUTH_HEADERS = {
  pluginId: "x-cms-plugin-id",
  timestamp: "x-cms-plugin-ts",
  nonce: "x-cms-plugin-nonce",
  signature: "x-cms-plugin-signature",
  version: "x-cms-plugin-auth-version",
  keyId: "x-cms-plugin-key-id"
} as const;
export function buildPluginRequestSignature(input: BuildPluginSignatureInput): string {
  if (
    !Number.isSafeInteger(input.timestamp) ||
    input.timestamp < 0 ||
    !/^[a-zA-Z0-9_-]{24,128}$/.test(input.nonce) ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(input.keyId) ||
    Buffer.byteLength(input.secret, "utf8") < 32
  )
    throw new Error("Invalid plugin signing key/timestamp/nonce");
  const pluginId = input.pluginId.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._/-]*$/.test(pluginId)) throw new Error("Invalid plugin signing owner");
  const material = canonicalPluginSignatureMaterial({
    ...input,
    pluginId,
    method: input.method.trim().toUpperCase(),
    bodyHash: buildBodyHash(input.body)
  });
  return createHmac("sha256", input.secret).update(material, "utf8").digest("hex");
}
export function buildPluginAuthHeaders(input: BuildPluginAuthHeadersInput): Record<string, string> {
  const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000),
    nonce = input.nonce ?? randomBytes(16).toString("hex");
  const signature = buildPluginRequestSignature({ ...input, timestamp, nonce });
  return {
    [PLUGIN_AUTH_HEADERS.pluginId]: input.pluginId.trim().toLowerCase(),
    [PLUGIN_AUTH_HEADERS.timestamp]: String(timestamp),
    [PLUGIN_AUTH_HEADERS.nonce]: nonce,
    [PLUGIN_AUTH_HEADERS.signature]: signature,
    [PLUGIN_AUTH_HEADERS.version]: "2",
    [PLUGIN_AUTH_HEADERS.keyId]: input.keyId
  };
}
export function signaturesEqual(a: string, b: string): boolean {
  if (!/^[a-fA-F0-9]{64}$/.test(a) || !/^[a-fA-F0-9]{64}$/.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
/** Canonical target includes the query; encoded path separators stay encoded. */
export function normalizePath(path: string): string {
  return canonicalRequestTarget(path);
}
export function buildBodyHash(body: unknown): string {
  return createHash("sha256").update(canonicalPluginJson(body), "utf8").digest("hex");
}
