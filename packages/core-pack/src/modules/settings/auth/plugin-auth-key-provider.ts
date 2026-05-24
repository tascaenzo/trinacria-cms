export interface PluginAuthKeyProvider {
  /**
   * Returns the shared auth secret for a plugin caller, or null when unknown.
   */
  getSecret(pluginId: string): Promise<string | null>;
  getSecrets?(pluginId: string): Promise<readonly string[]>;
}

export interface EnvPluginAuthKeyProviderOptions {
  keys?: Record<string, string | readonly string[]>;
}

/**
 * Default key provider based on environment configuration.
 * The expected format is CMS_PLUGIN_AUTH_KEYS_JSON='{\"plugin-id\":\"secret\"}'.
 */
export class EnvPluginAuthKeyProvider implements PluginAuthKeyProvider {
  private readonly keys: Map<string, readonly string[]>;

  constructor(options?: EnvPluginAuthKeyProviderOptions) {
    this.keys = new Map(
      Object.entries(options?.keys ?? readKeysFromEnv()).map(([pluginId, secrets]) => [
        pluginId.trim().toLowerCase(),
        Array.isArray(secrets) ? secrets : [secrets]
      ])
    );
  }

  async getSecret(pluginId: string): Promise<string | null> {
    const normalized = pluginId.trim().toLowerCase();
    return this.keys.get(normalized)?.[0] ?? null;
  }

  async getSecrets(pluginId: string): Promise<readonly string[]> {
    const normalized = pluginId.trim().toLowerCase();
    return this.keys.get(normalized) ?? [];
  }
}

function readKeysFromEnv(): Record<string, readonly string[]> {
  const raw = process.env.CMS_PLUGIN_AUTH_KEYS_JSON?.trim();
  if (!raw) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid CMS_PLUGIN_AUTH_KEYS_JSON. Expected JSON object. Cause: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid CMS_PLUGIN_AUTH_KEYS_JSON. Expected object map pluginId -> secret");
  }

  const entries = Object.entries(parsed as Record<string, unknown>);
  const result: Record<string, readonly string[]> = {};
  for (const [pluginId, secret] of entries) {
    const normalizedPluginId = pluginId.trim().toLowerCase();
    if (typeof secret === "string") {
      if (secret.trim().length < 8) {
        throw new Error(
          `Invalid secret for plugin "${pluginId}" in CMS_PLUGIN_AUTH_KEYS_JSON (min length 8)`
        );
      }
      result[normalizedPluginId] = [secret];
      continue;
    }
    if (Array.isArray(secret) && secret.length > 0) {
      const normalized = secret.map((item) => {
        if (typeof item !== "string" || item.trim().length < 8) {
          throw new Error(
            `Invalid secret for plugin "${pluginId}" in CMS_PLUGIN_AUTH_KEYS_JSON (min length 8)`
          );
        }
        return item;
      });
      result[normalizedPluginId] = normalized;
      continue;
    }
    throw new Error(
      `Invalid secret for plugin "${pluginId}" in CMS_PLUGIN_AUTH_KEYS_JSON (expected string or non-empty string array)`
    );
  }
  return result;
}
