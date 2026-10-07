import { Readable } from "node:stream";
import {
  apiError,
  createPluginApiResponder,
  type HttpContext,
  HttpController,
  response
} from "@trinacria-cms/kernel";
import type { OperationAuthorizer } from "@trinacria-cms/kernel/contracts";
import {
  createSystemOperationContext,
  PublicRequestLimitedError
} from "@trinacria-cms/kernel/runtime";
import type { MediaProviderRegistry } from "./media-provider-registry.service.js";
import type { MediaAssetsService } from "./services/media-assets.service.js";

const responder = createPluginApiResponder("media-pack");
const target = { ownerPluginId: "media-pack", resource: "assets", action: "read" } as const;
export class MediaPublicDeliveryController extends HttpController {
  constructor(
    private readonly assets: MediaAssetsService,
    private readonly providers: MediaProviderRegistry,
    private readonly authorizer: OperationAuthorizer,
    private readonly limiter: { consume(clientId: string): Promise<void> }
  ) {
    super();
  }
  routes() {
    return this.router()
      .get("/v1/delivery/media/:id", this.read, {
        docs: {
          pluginId: "media-pack",
          operationId: "getPublicMediaContent",
          summary: "Stream ready public Media after fresh ACL checks",
          tags: ["Delivery"],
          security: [],
          responses: {
            200: {
              description: "Public media bytes",
              contentType: "application/octet-stream",
              schema: { type: "string", format: "binary" }
            },
            404: { description: "Public media unavailable" },
            429: { description: "Public request limit exceeded" },
            503: { description: "Storage unavailable" }
          }
        }
      })
      .build();
  }
  private read = async (ctx: HttpContext) => {
    let stream: Readable | undefined;
    try {
      await this.limiter.consume(ctx.req.socket.remoteAddress ?? "unknown-peer");
      const context = createSystemOperationContext("public-delivery", [target]);
      await this.authorizer.assert(context, target);
      const asset = await this.assets.getAsset(ctx.params.id!);
      if (!asset || asset.status !== "ready" || asset.visibility !== "public")
        return responder.notFound("Public media unavailable");
      const provider = this.providers.get(asset.providerId);
      if (!provider.readObject) throw new Error("Provider has no public streaming capability");
      stream = Readable.from(
        await provider.readObject({ storageKey: asset.storageKey, signal: ctx.signal })
      );
      const current = await this.assets.getAsset(asset.id);
      await this.authorizer.assert(context, target);
      if (
        !current ||
        current.status !== "ready" ||
        current.visibility !== "public" ||
        current.aclVersion !== asset.aclVersion ||
        current.storageKey !== asset.storageKey ||
        current.providerId !== asset.providerId
      ) {
        stream.destroy();
        return responder.notFound("Public media unavailable");
      }
      const inline = ["image/png", "image/jpeg", "image/webp", "image/avif", "image/gif"].includes(
        asset.mimeType
      );
      return response(stream, {
        headers: {
          "content-type": inline ? asset.mimeType : "application/octet-stream",
          "content-disposition": inline ? "inline" : "attachment",
          "cache-control": "private, no-store",
          "x-content-type-options": "nosniff",
          "content-security-policy": "default-src 'none'; sandbox"
        }
      });
    } catch (error) {
      stream?.destroy();
      if (error instanceof PublicRequestLimitedError)
        return response(apiError("rate_limited", "Public request limit exceeded"), {
          status: 429,
          headers: { "retry-after": "60", "cache-control": "no-store" }
        });
      return response(apiError("service_unavailable", "Public media temporarily unavailable"), {
        status: 503,
        headers: { "cache-control": "no-store" }
      });
    }
  };
}
