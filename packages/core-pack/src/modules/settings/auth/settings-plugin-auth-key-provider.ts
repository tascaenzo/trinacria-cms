export interface PluginAuthKeyProvider {
  /**
   * Returns the shared auth secret for a plugin caller, or null when unknown.
   */
  getSecret(pluginId: string): Promise<string | null>;
}

export interface EnvPluginAuthKeyProviderOptions {
  keys?: Record<string, string>;
}

/**
 * Default key provider based on environment configuration.
 * The expected format is CMS_PLUGIN_AUTH_KEYS_JSON='{\"plugin-id\":\"secret\"}'.
 */
export class EnvPluginAuthKeyProvider implements PluginAuthKeyProvider {
  private readonly keys: Map<string, string>;

  constructor(options?: EnvPluginAuthKeyProviderOptions) {
    this.keys = new Map(
      Object.entries(options?.keys ?? readKeysFromEnv()).map(([pluginId, secret]) => [
        pluginId.trim().toLowerCase(),
        secret,
      ]),
    );
  }

  async getSecret(pluginId: string): Promise<string | null> {
    const normalized = pluginId.trim().toLowerCase();
    return this.keys.get(normalized) ?? null;
  }
}

function readKeysFromEnv(): Record<string, string> {
  const raw = process.env.CMS_PLUGIN_AUTH_KEYS_JSON?.trim();
  if (!raw) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid CMS_PLUGIN_AUTH_KEYS_JSON. Expected JSON object. Cause: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid CMS_PLUGIN_AUTH_KEYS_JSON. Expected object map pluginId -> secret");
  }

  const entries = Object.entries(parsed as Record<string, unknown>);
  const result: Record<string, string> = {};
  for (const [pluginId, secret] of entries) {
    if (typeof secret !== "string" || secret.trim().length < 8) {
      throw new Error(
        `Invalid secret for plugin "${pluginId}" in CMS_PLUGIN_AUTH_KEYS_JSON (min length 8)`,
      );
    }
    result[pluginId.trim().toLowerCase()] = secret;
  }
  return result;
}

