import type { KernelPluginDefinition } from "@trinacria-cms/kernel/contracts";
import { CorePackRootModule } from "../modules/core-pack-root.module.js";
import {
  provisionCorePackSettingDefinitions,
  SETTINGS_SERVICE_TOKEN,
  type SettingsService
} from "../modules/settings/index.js";
import { CORE_PACK_MANIFEST } from "./core-pack.manifest.js";

/**
 * Factory returning the baseline core-pack plugin definition.
 */
export function createCorePackPlugin(): KernelPluginDefinition {
  return {
    manifest: CORE_PACK_MANIFEST,
    modules: [CorePackRootModule],
    async onInit(context) {
      const settings = await context.app.resolve<SettingsService>(SETTINGS_SERVICE_TOKEN);
      await provisionCorePackSettingDefinitions(settings);
    }
  };
}
