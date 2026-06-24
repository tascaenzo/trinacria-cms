import type { DbAdapter } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";

const SETTINGS_ENTITY_NAME = "settings";

/**
 * Legacy direct setting reader.
 *
 * @deprecated Use RuntimeConfigService instead (inject RUNTIME_CONFIG_SERVICE_TOKEN).
 *             RuntimeConfigService provides typed getters with caching, env fallback,
 *             and validation.
 */
export async function readCorePackSettingValue(
  db: DbAdapter,
  key: string
): Promise<unknown | undefined> {
  try {
    const repo = db.repository(SETTINGS_ENTITY_NAME, { pluginId: CORE_PACK_PLUGIN_ID });
    const valueRecord = await repo.findOne({ filter: { kind: "value", key } });
    if (valueRecord) {
      return (valueRecord as Record<string, unknown>).value;
    }
    const defRecord = await repo.findOne({ filter: { kind: "definition", key } });
    if (defRecord) {
      return (defRecord as Record<string, unknown>).defaultValue;
    }
  } catch {
    // Settings may not be available during early bootstrap.
  }
  return undefined;
}
