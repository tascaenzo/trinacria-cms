import { s } from "@trinacria-cms/kernel";

const sitesSchema = s.array(
  s.object(
    {
      id: s.string({ pattern: /^[a-z][a-z0-9-]{0,79}$/ }),
      origin: s.string({ maxLength: 300 })
    },
    { strict: true }
  ),
  { maxItems: 50 }
);
export interface PreviewConfig {
  activeKeyId: string;
  keys: ReadonlyMap<string, Uint8Array>;
  sites: ReadonlyMap<string, string>;
}
/** Optional capability: incomplete configuration never falls back to an access JWT key. */
export function readPreviewConfig(env: NodeJS.ProcessEnv = process.env): PreviewConfig | null {
  const activeKeyId = env.CMS_PREVIEW_ACTIVE_KEY_ID;
  const rawKeys = env.CMS_PREVIEW_KEYS_JSON,
    rawSites = env.CMS_PREVIEW_SITES_JSON;
  if (!activeKeyId && !rawKeys && !rawSites) return null;
  if (!activeKeyId || !rawKeys || !rawSites) throw new Error("Incomplete preview configuration");
  const parsed = s
    .record(s.string({ pattern: /^[a-zA-Z0-9_-]{1,80}$/ }), s.string())
    .parse(JSON.parse(rawKeys));
  const keys = new Map<string, Uint8Array>();
  for (const [id, encoded] of Object.entries(parsed)) {
    const key = Buffer.from(encoded, "base64");
    if (
      key.length < 32 ||
      key.toString("base64") !== encoded ||
      encoded === env.CMS_JWT_SECRET ||
      key.toString("utf8") === env.CMS_JWT_SECRET
    )
      throw new Error("Preview keys must be separate random keys of at least 32 bytes");
    keys.set(id, key);
  }
  if (!keys.has(activeKeyId)) throw new Error("Active preview key is missing");
  const sites = new Map<string, string>();
  for (const site of sitesSchema.parse(JSON.parse(rawSites))) {
    const url = new URL(site.origin);
    const local =
      env.NODE_ENV !== "production" &&
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      (!local && url.protocol !== "https:") ||
      url.origin !== site.origin ||
      url.username ||
      url.password ||
      sites.has(site.id)
    )
      throw new Error("Preview sites require unique IDs and exact HTTPS origins");
    sites.set(site.id, url.origin);
  }
  if (!sites.size) throw new Error("Preview requires at least one allowed site");
  return { activeKeyId, keys, sites };
}
