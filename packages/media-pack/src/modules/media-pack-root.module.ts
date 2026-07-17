import { defineModule, type ModuleDefinition } from "@trinacria-cms/kernel";
import { MediaPackMediaModule } from "./media/media.module.js";

export const MediaPackRootModule: ModuleDefinition = defineModule({
  name: "MediaPackRootModule",
  imports: [MediaPackMediaModule]
});
