export interface PluginAuthKey {
  id: string;
  secret: string;
}
export interface PluginAuthKeyring {
  current: PluginAuthKey;
  previous?: PluginAuthKey & { acceptUntil: string };
}
export interface PluginAuthKeyProvider {
  getKey(pluginId: string, keyId: string, now: number): Promise<PluginAuthKey | null>;
}
export interface EnvPluginAuthKeyProviderOptions {
  keys?: Record<string, PluginAuthKeyring>;
}
/** Explicit key IDs; previous keys are accepted only before their configured expiry. */
export class EnvPluginAuthKeyProvider implements PluginAuthKeyProvider {
  private readonly keys = new Map<string, PluginAuthKeyring>();
  constructor(options?: EnvPluginAuthKeyProviderOptions) {
    const keys = options?.keys ?? readKeysFromEnv();
    for (const [pluginId, ring] of Object.entries(keys)) {
      if (!/^[a-z0-9][a-z0-9._/-]*$/.test(pluginId) || !ring || typeof ring !== "object")
        throw new Error("Invalid plugin auth keyring owner");
      validateKey(ring.current);
      if (ring.previous) {
        validateKey(ring.previous);
        if (
          ring.previous.id === ring.current.id ||
          !Number.isFinite(Date.parse(ring.previous.acceptUntil))
        )
          throw new Error("Previous plugin key requires a distinct ID and finite expiry");
      }
      this.keys.set(pluginId, structuredClone(ring));
    }
  }
  async getKey(pluginId: string, keyId: string, now: number): Promise<PluginAuthKey | null> {
    const ring = this.keys.get(pluginId);
    if (ring?.current.id === keyId) return { ...ring.current };
    if (ring?.previous?.id === keyId && Date.parse(ring.previous.acceptUntil) > now)
      return { id: ring.previous.id, secret: ring.previous.secret };
    return null;
  }
}
function validateKey(key: PluginAuthKey) {
  if (
    !key ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(key.id) ||
    typeof key.secret !== "string" ||
    Buffer.byteLength(key.secret, "utf8") < 32
  )
    throw new Error(
      "Plugin auth keys require an explicit key ID and at least 32 bytes of secret material"
    );
}
function readKeysFromEnv(): Record<string, PluginAuthKeyring> {
  const raw = process.env.CMS_PLUGIN_AUTH_KEYS_JSON?.trim();
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid CMS_PLUGIN_AUTH_KEYS_JSON keyring JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Plugin keyrings must be an object keyed by canonical plugin ID");
  return parsed as Record<string, PluginAuthKeyring>;
}
