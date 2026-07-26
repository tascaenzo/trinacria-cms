import type { KernelPluginDefinition } from "@trinacria-cms/kernel/contracts";
import { CONTENT_TYPES_SERVICE_TOKEN } from "../modules/content-types/content-types.tokens.js";
import type { ContentTypesService } from "../modules/content-types/services/content-types.service.js";
import { EditorialPackRootModule } from "../modules/editorial-pack-root.module.js";
import { ENTRIES_SERVICE_TOKEN } from "../modules/entries/entries.tokens.js";
import type { EntriesService } from "../modules/entries/services/entries.service.js";
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
      const entries = await context.app.resolve<EntriesService>(ENTRIES_SERVICE_TOKEN);
      entries.setPublisher(context.events);
      await entries.ensureDefaultBlogContent();
    }
  };
}

export const EDITORIAL_PACK_PLUGIN = createEditorialPackPlugin();
