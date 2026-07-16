import type { KernelPluginDefinition } from "@trinacria-cms/kernel/contracts";
import { CorePackRootModule } from "../modules/core-pack-root.module.js";
import { CORE_PACK_MANIFEST } from "./core-pack.manifest.js";
import { CORE_PACK_ADMIN_I18N_SOURCES } from "../admin-i18n/index.js";

/**
 * Factory returning the baseline core-pack plugin definition.
 */
export function createCorePackPlugin(): KernelPluginDefinition {
  return {
    manifest: CORE_PACK_MANIFEST,
    i18nSources: CORE_PACK_ADMIN_I18N_SOURCES,
    modules: [CorePackRootModule]
  };
}
