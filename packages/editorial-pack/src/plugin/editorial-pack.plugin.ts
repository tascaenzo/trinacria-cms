import type { KernelPluginDefinition } from "@trinacria-cms/kernel/contracts";
import { EditorialPackRootModule } from "../modules/editorial-pack-root.module.js";
import { invalidateDeliveryCache } from "../modules/publications/delivery-cache.js";
import { EDITORIAL_PACK_MANIFEST } from "./editorial-pack.manifest.js";
export function createEditorialPackPlugin(): KernelPluginDefinition {
  return {
    manifest: EDITORIAL_PACK_MANIFEST,
    modules: [EditorialPackRootModule],
    eventHandlers: {
      async invalidateDelivery(payload, envelope, context) {
        await invalidateDeliveryCache(context.services.storage, payload, envelope.id);
      }
    },
    async onInstall(context, input) {
      if (input.dataMode === "demo")
        await context.services.operations.call("editorial-pack", "initializeDemo", {
          adminUserId: input.adminUserId
        });
    },
    async onLoad(context) {
      await context.services.operations.call("editorial-pack", "initialize", {});
    }
  };
}
export const EDITORIAL_PACK_PLUGIN = createEditorialPackPlugin();
