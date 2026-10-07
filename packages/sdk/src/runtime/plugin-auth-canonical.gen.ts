// Generated from scripts/contracts/plugin-auth-canonical.ts; run npm run signing:update.
/** Shared protocol v2 source; synchronized into SDK/Core without adding browser dependencies. */
export function canonicalRequestTarget(value: string): string {
  if (/%(?![a-fA-F0-9]{2})/.test(value) || /[\r\n\0]/.test(value))
    throw new Error("Malformed request target");
  const url = new URL(value, "http://canonical.invalid");
  // URLSearchParams tolerates malformed UTF-8; authentication must reject it.
  decodeURIComponent(url.pathname);
  for (const part of url.search.slice(1).split("&")) {
    const separator = part.indexOf("=");
    for (const item of separator === -1
      ? [part]
      : [part.slice(0, separator), part.slice(separator + 1)])
      decodeURIComponent(item.replaceAll("+", "%20"));
  }
  let path = url.pathname.replace(/%[a-fA-F0-9]{2}/g, (value) => value.toUpperCase());
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  const parameters = new URLSearchParams(url.search);
  parameters.sort();
  const encode = (value: string) =>
    encodeURIComponent(value).replace(
      /[!'()*]/g,
      (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
    );
  const query = [...parameters].map(([key, value]) => `${encode(key)}=${encode(value)}`).join("&");
  return path + (query ? `?${query}` : "");
}
export function canonicalPluginJson(value: unknown, depth = 0): string {
  if (depth > 64) throw new Error("JSON signing depth exceeds limit");
  if (value === undefined && depth === 0) return "";
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${Array.from(value, (item) => canonicalPluginJson(item, depth + 1)).join(",")}]`;
  if (
    value &&
    typeof value === "object" &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    const keys = Object.keys(value).sort();
    if (keys.some((key) => ["__proto__", "constructor", "prototype"].includes(key)))
      throw new Error("Unsafe JSON signing key");
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalPluginJson((value as Record<string, unknown>)[key], depth + 1)}`).join(",")}}`;
  }
  throw new Error("Signing body must be finite plain JSON");
}
export function canonicalPluginSignatureMaterial(input: {
  pluginId: string;
  keyId: string;
  method: string;
  path: string;
  timestamp: number;
  nonce: string;
  bodyHash: string;
}): string {
  return canonicalPluginJson({
    version: 2,
    keyId: input.keyId,
    pluginId: input.pluginId,
    method: input.method.toUpperCase(),
    requestTarget: canonicalRequestTarget(input.path),
    timestamp: input.timestamp,
    nonce: input.nonce,
    bodyHash: input.bodyHash
  });
}
