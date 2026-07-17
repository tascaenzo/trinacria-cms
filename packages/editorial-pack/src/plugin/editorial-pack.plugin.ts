import type { KernelPluginDefinition } from "@trinacria-cms/kernel/contracts";
import { EditorialPackRootModule } from "../modules/editorial-pack-root.module.js";
import { EDITORIAL_PACK_MANIFEST } from "./editorial-pack.manifest.js";

export function createEditorialPackPlugin(): KernelPluginDefinition {
  return {
    manifest: EDITORIAL_PACK_MANIFEST,
    modules: [EditorialPackRootModule]
  };
}

export const EDITORIAL_PACK_PLUGIN = createEditorialPackPlugin();
