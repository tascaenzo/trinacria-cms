import { defineModule, type ModuleDefinition } from "@trinacria-cms/kernel";
import { EDITORIAL_OPERATIONS } from "../plugin/editorial-pack.operations.js";
import { EditorialContentTypesModule } from "./content-types/content-types.module.js";
import { EditorialEntriesModule } from "./entries/entries.module.js";
import { EditorialPreviewModule } from "./preview/preview.module.js";
import { EditorialPublicationsModule } from "./publications/publications.module.js";

/** Root composition point for Editorial Pack domain modules. */
export const EditorialPackRootModule: ModuleDefinition = defineModule({
  name: "EditorialPackRootModule",
  exports: [EDITORIAL_OPERATIONS.token],
  providers: [EDITORIAL_OPERATIONS],
  imports: [
    EditorialContentTypesModule,
    EditorialEntriesModule,
    EditorialPublicationsModule,
    EditorialPreviewModule
  ]
});
