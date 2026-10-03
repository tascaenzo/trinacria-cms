import {
  apiError,
  createPluginApiResponder,
  type HttpContext,
  HttpController,
  response,
  s,
  ValidationError
} from "@trinacria-cms/kernel";
import {
  PublicRequestLimitedError,
  type PublicRequestLimiter
} from "@trinacria-cms/kernel/runtime";
import { EditorialJsonObjectSchema } from "../entries/editorial-json.js";
import { EntryBodySchema } from "../entries/structured-document.js";
import type { EditorialDeliveryService } from "./delivery.service.js";

const responder = createPluginApiResponder("editorial-pack");
const publicEntry = s.object(
  {
    id: s.string(),
    contentTypeKey: s.string(),
    publicationVersion: s.number(),
    deliveryConfigVersion: s.number(),
    publishedAt: s.dateTimeString(),
    title: s.string().optional(),
    slug: s.string().optional(),
    body: EntryBodySchema.optional(),
    data: EditorialJsonObjectSchema
  },
  { strict: true }
);
const pagination = s.object(
  {
    limit: s.number({ int: true, min: 1, max: 100 }).optional(),
    offset: s.number({ int: true, min: 0, max: 10000 }).optional()
  },
  { strict: true }
);
export class EditorialDeliveryController extends HttpController {
  constructor(
    private readonly delivery: EditorialDeliveryService,
    private readonly limiter: Pick<PublicRequestLimiter, "consume">
  ) {
    super();
  }
  routes() {
    const docs = (operationId: string, list: boolean) => ({
      pluginId: "editorial-pack",
      operationId,
      tags: ["Delivery"],
      summary: operationId,
      security: [],
      responses: {
        200: {
          description: "Allowlisted published content",
          schema: {
            type: "object",
            required: ["data"],
            properties: {
              data: list
                ? { type: "array", items: publicEntry.toOpenApi() }
                : publicEntry.toOpenApi(),
              meta: { type: "object", additionalProperties: true }
            }
          }
        },
        404: { description: "Public resource unavailable" },
        429: { description: "Request limit exceeded" },
        503: { description: "Public content temporarily unavailable" }
      }
    });
    return this.router()
      .get("/v1/delivery/navigation", this.navigation, {
        docs: {
          ...docs("getPublicNavigation", true),
          responses: {
            ...docs("getPublicNavigation", true).responses,
            200: {
              description: "Safe links in configured order, with published targets only",
              schema: {
                type: "object",
                required: ["data"],
                properties: {
                  data: s.array(s.object({ label: s.string(), href: s.string() })).toOpenApi()
                }
              }
            }
          }
        }
      })
      .get("/v1/delivery/content-types/:key/entries", this.list, {
        docs: {
          ...docs("listPublishedEntries", true),
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
            { name: "offset", in: "query", schema: { type: "integer", minimum: 0, maximum: 10000 } }
          ]
        }
      })
      .get("/v1/delivery/content-types/:key/entries/:slug", this.get, {
        docs: {
          ...docs("getPublishedEntry", false),
          parameters: [{ name: "If-None-Match", in: "header", schema: { type: "string" } }],
          responses: {
            ...docs("getPublishedEntry", false).responses,
            304: { description: "Unchanged after fresh publication and Media checks" }
          }
        }
      })
      .build();
  }
  private navigation = (ctx: HttpContext) =>
    this.execute(ctx, async () =>
      response(
        { data: await this.delivery.navigation() },
        { headers: { "cache-control": "public, max-age=0, must-revalidate" } }
      )
    );
  private async execute(ctx: HttpContext, work: () => Promise<unknown>) {
    try {
      // Direct socket identity: proxy headers never choose another client's bucket.
      await this.limiter.consume(ctx.req.socket.remoteAddress ?? "unknown-peer");
      return await work();
    } catch (error) {
      if (error instanceof ValidationError) return responder.fromError(error);
      if (error instanceof PublicRequestLimitedError)
        return response(apiError("rate_limited", "Public request limit exceeded"), {
          status: 429,
          headers: { "retry-after": "60", "cache-control": "no-store" }
        });
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "validation_error"
      )
        return responder.fromError(error);
      if (error && typeof error === "object" && "code" in error && error.code === "invalid_request")
        return responder.fromError(error);
      return response(apiError("service_unavailable", "Public content temporarily unavailable"), {
        status: 503,
        headers: { "cache-control": "no-store" }
      });
    }
  }
  private list = (ctx: HttpContext) =>
    this.execute(ctx, async () => {
      const query = pagination.parse({
        ...ctx.query,
        ...(ctx.query.limit === undefined ? {} : { limit: Number(ctx.query.limit) }),
        ...(ctx.query.offset === undefined ? {} : { offset: Number(ctx.query.offset) })
      });
      const result = await this.delivery.list(
        ctx.params.key!,
        query.limit ?? 50,
        query.offset ?? 0
      );
      return result
        ? response(
            {
              data: result.items,
              meta: { count: result.items.length, limit: result.limit, offset: result.offset }
            },
            { headers: { "cache-control": "public, max-age=0, must-revalidate" } }
          )
        : responder.notFound("Public resource unavailable");
    });
  private get = (ctx: HttpContext) =>
    this.execute(ctx, async () => {
      s.object({}, { strict: true }).parse(ctx.query);
      const result = await this.delivery.get(ctx.params.key!, ctx.params.slug!);
      if (!result) return responder.notFound("Public resource unavailable");
      const headers = { etag: result.etag, "cache-control": "public, max-age=0, must-revalidate" };
      return ctx.req.headers["if-none-match"] === result.etag
        ? response(null, { status: 304, headers })
        : response({ data: result.entry }, { headers });
    });
}
