import { defineModule, type ModuleDefinition } from "@trinacria-cms/kernel";
import { MEDIA_OPERATIONS } from "../plugin/media-pack.operations.js";
import { MediaPackMediaModule } from "./media/media.module.js";

export const MediaPackRootModule: ModuleDefinition = defineModule({
  name: "MediaPackRootModule",
  exports: [MEDIA_OPERATIONS.token],
  providers: [MEDIA_OPERATIONS],
  imports: [MediaPackMediaModule]
});
