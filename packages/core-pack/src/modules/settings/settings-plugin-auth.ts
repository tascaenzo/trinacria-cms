import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export interface BuildPluginSignatureInput {
  pluginId: string;
  secret: string;
  method: string;
  path: string;
  timestamp: number;
  nonce: string;
  body: unknown;
}

export interface BuildPluginAuthHeadersInput {
  pluginId: string;
  secret: string;
  method: string;
  path: string;
  body: unknown;
  timestamp?: number;
  nonce?: string;
}

/**
 * Canonical auth header names for signed plugin-to-plugin requests.
 */
export const PLUGIN_AUTH_HEADERS = {
  pluginId: "x-cms-plugin-id",
  timestamp: "x-cms-plugin-ts",
  nonce: "x-cms-plugin-nonce",
  signature: "x-cms-plugin-signature",
} as const;

/**
 * Builds deterministic HMAC signature for plugin-authenticated HTTP requests.
 */
export function buildPluginRequestSignature(
  input: BuildPluginSignatureInput,
): string {
  const canonical = [
    input.method.trim().toUpperCase(),
    normalizePath(input.path),
    String(input.timestamp),
    input.nonce.trim(),
    input.pluginId.trim().toLowerCase(),
    buildBodyHash(input.body),
  ].join("\n");

  return createHmac("sha256", input.secret)
    .update(canonical, "utf8")
    .digest("hex");
}

/**
 * Creates signed headers for plugin caller authentication.
 */
export function buildPluginAuthHeaders(
  input: BuildPluginAuthHeadersInput,
): Record<string, string> {
  const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000);
  const nonce = input.nonce ?? randomBytes(12).toString("hex");
  const signature = buildPluginRequestSignature({
    pluginId: input.pluginId,
    secret: input.secret,
    method: input.method,
    path: input.path,
    timestamp,
    nonce,
    body: input.body,
  });

  return {
    [PLUGIN_AUTH_HEADERS.pluginId]: input.pluginId.trim().toLowerCase(),
    [PLUGIN_AUTH_HEADERS.timestamp]: String(timestamp),
    [PLUGIN_AUTH_HEADERS.nonce]: nonce,
    [PLUGIN_AUTH_HEADERS.signature]: signature,
  };
}

/**
 * Compares hex signatures in constant time.
 */
export function signaturesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length || left.length === 0) {
    return false;
  }
  return timingSafeEqual(left, right);
}

/**
 * Returns normalized path used in signature canonicalization.
 */
export function normalizePath(path: string): string {
  const pathname = new URL(path, "http://localhost").pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/**
 * Computes stable SHA-256 hash of request body after canonical serialization.
 */
export function buildBodyHash(body: unknown): string {
  const serialized = canonicalSerialize(body);
  return createHash("sha256").update(serialized, "utf8").digest("hex");
}

function canonicalSerialize(value: unknown): string {
  if (value === undefined) return "";
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Buffer.isBuffer(value)) {
    return value.toString("base64");
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalSerialize(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "__proto__" && key !== "prototype" && key !== "constructor")
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalSerialize(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(String(value));
}
