import type { KernelPluginDefinition } from "@trinacria-cms/kernel/contracts";
import { EditorialPackRootModule } from "../modules/editorial-pack-root.module.js";
import { CONTENT_TYPES_SERVICE_TOKEN } from "../modules/content-types/content-types.tokens.js";
import { ContentTypesService } from "../modules/content-types/services/content-types.service.js";
import { EDITORIAL_PACK_MANIFEST } from "./editorial-pack.manifest.js";

export function createEditorialPackPlugin(): KernelPluginDefinition {
  return {
    manifest: EDITORIAL_PACK_MANIFEST,
    modules: [EditorialPackRootModule],
    async onLoad(context) {
      const contentTypes = await context.app.resolve<ContentTypesService>(
        CONTENT_TYPES_SERVICE_TOKEN
      );
      await contentTypes.ensureDefaultContentTypes();
    }
  };
}

export const EDITORIAL_PACK_PLUGIN = createEditorialPackPlugin();
