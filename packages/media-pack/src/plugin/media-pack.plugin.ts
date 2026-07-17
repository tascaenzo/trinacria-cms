import type { KernelPluginDefinition } from "@trinacria-cms/kernel/contracts";
import { MediaPackRootModule } from "../modules/media-pack-root.module.js";
import {
  MEDIA_DOMAIN_EVENTS_SERVICE_TOKEN,
  MEDIA_UPLOADS_SERVICE_TOKEN,
  type MediaDomainEventsService,
  type MediaUploadsService
} from "../modules/media/index.js";
import { MEDIA_PACK_MANIFEST } from "./media-pack.manifest.js";

export function createMediaPackPlugin(): KernelPluginDefinition {
  return {
    manifest: MEDIA_PACK_MANIFEST,
    modules: [MediaPackRootModule],
    async onLoad(context) {
      const uploads = await context.app.resolve<MediaUploadsService>(MEDIA_UPLOADS_SERVICE_TOKEN);
      const events = await context.app.resolve<MediaDomainEventsService>(
        MEDIA_DOMAIN_EVENTS_SERVICE_TOKEN
      );
      events.setPublisher(context.events);
      await uploads.cleanupExpired();
      if (cleanupTimer) clearInterval(cleanupTimer);
      cleanupTimer = setInterval(() => {
        void uploads.cleanupExpired();
      }, CLEANUP_INTERVAL_MS);
      cleanupTimer.unref();
    },
    async onUnload() {
      if (cleanupTimer) clearInterval(cleanupTimer);
      cleanupTimer = undefined;
    }
  };
}

export const MEDIA_PACK_PLUGIN = createMediaPackPlugin();

const CLEANUP_INTERVAL_MS = 5 * 60_000;
let cleanupTimer: NodeJS.Timeout | undefined;
