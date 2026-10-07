import type { KernelPluginDefinition } from "@trinacria-cms/kernel/contracts";
import { MediaPackRootModule } from "../modules/media-pack-root.module.js";
import { MEDIA_PACK_MANIFEST } from "./media-pack.manifest.js";
export function createMediaPackPlugin(): KernelPluginDefinition {
  return {
    manifest: MEDIA_PACK_MANIFEST,
    modules: [MediaPackRootModule],
    async onLoad(context) {
      await context.services.operations.call("media-pack", "initialize", {});
    },
    async onUnload(context) {
      await context.services.operations.call("media-pack", "shutdown", {});
    }
  };
}
export const MEDIA_PACK_PLUGIN = createMediaPackPlugin();
