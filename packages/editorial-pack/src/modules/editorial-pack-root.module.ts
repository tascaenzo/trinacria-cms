import { defineModule, type ModuleDefinition } from "@trinacria-cms/kernel";
import { EditorialContentTypesModule } from "./content-types/content-types.module.js";

/** Root composition point for Editorial Pack domain modules. */
export const EditorialPackRootModule: ModuleDefinition = defineModule({
  name: "EditorialPackRootModule",
  imports: [EditorialContentTypesModule]
});
