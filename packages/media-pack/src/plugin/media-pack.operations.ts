import { createToken, s } from "@trinacria-cms/kernel";
import type { PluginOperationsProvider } from "@trinacria-cms/kernel/plugin-api";
import {
  createSystemOperationContext,
  pluginOperationsProvider
} from "@trinacria-cms/kernel/runtime";
import {
  MEDIA_DOMAIN_EVENTS_SERVICE_TOKEN,
  type MediaDomainEventsService
} from "../modules/media/index.js";
import {
  MEDIA_ASSET_OPERATIONS,
  MEDIA_UPLOAD_OPERATIONS,
  type MediaAssetOperations,
  type MediaUploadOperations
} from "../operations/media-operations.js";
export const MEDIA_OPERATIONS = pluginOperationsProvider(
  createToken<PluginOperationsProvider>("MEDIA_OPERATIONS"),
  "media-pack",
  (
    uploads: MediaUploadOperations,
    events: MediaDomainEventsService,
    assets: MediaAssetOperations
  ) => {
    let cleanupTimer: NodeJS.Timeout | undefined;
    return [
      {
        name: "assets.get",
        requiredPermission: "media-pack:assets:read",
        input: s.object({ id: s.string({ minLength: 1 }) }, { strict: true }),
        invoke: (input, context) =>
          assets.getAsset(context.operationContext, (input as { id: string }).id)
      },
      {
        name: "assets.list",
        requiredPermission: "media-pack:assets:read",
        input: s.object(
          {
            limit: s.number({ int: true, min: 1, max: 100 }).optional(),
            offset: s.number({ int: true, min: 0 }).optional()
          },
          { strict: true }
        ),
        invoke: (input, context) =>
          assets.listAssets(context.operationContext, input as { limit?: number; offset?: number })
      },
      {
        name: "assets.access-url",
        requiredPermission: "media-pack:assets:read",
        input: s.object(
          {
            id: s.string({ minLength: 1 }),
            expiresInSeconds: s.number({ int: true, min: 1, max: 3600 }).optional()
          },
          { strict: true }
        ),
        invoke: (input, context) => {
          const request = input as { id: string; expiresInSeconds?: number };
          return assets.accessUrl(context.operationContext, request.id, request.expiresInSeconds);
        }
      },
      {
        name: "assets.delete",
        requiredPermission: "media-pack:assets:delete",
        input: s.object({ id: s.string({ minLength: 1 }) }, { strict: true }),
        invoke: (input, context) =>
          assets.deleteAsset(context.operationContext, (input as { id: string }).id)
      },
      {
        name: "initialize",
        private: true,
        input: s.object({}),
        async invoke(_input, context) {
          events.setPublisher(context.events);
          await uploads.cleanupExpired(
            createSystemOperationContext("media-cleanup", [
              { ownerPluginId: "media-pack", resource: "assets", action: "delete" }
            ])
          );
          if (cleanupTimer) clearInterval(cleanupTimer);
          cleanupTimer = setInterval(() => {
            void uploads
              .cleanupExpired(
                createSystemOperationContext("media-cleanup", [
                  { ownerPluginId: "media-pack", resource: "assets", action: "delete" }
                ])
              )
              .catch(() => console.error("[media-pack] Upload cleanup failed"));
          }, 5 * 60_000);
          cleanupTimer.unref();
          return null;
        }
      },
      {
        name: "shutdown",
        private: true,
        input: s.object({}),
        invoke() {
          if (cleanupTimer) clearInterval(cleanupTimer);
          cleanupTimer = undefined;
          events.setPublisher(undefined);
          return null;
        }
      }
    ];
  },
  [MEDIA_UPLOAD_OPERATIONS, MEDIA_DOMAIN_EVENTS_SERVICE_TOKEN, MEDIA_ASSET_OPERATIONS]
);
