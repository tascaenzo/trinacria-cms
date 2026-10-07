import { createJwtAuthMiddleware, type JwtAuthService } from "@trinacria-cms/core-pack";
import {
  apiError,
  type HttpContext,
  HttpController,
  type RouteOpenApiDocs,
  response,
  s,
  ValidationError
} from "@trinacria-cms/kernel";
import { getHttpOperationContext } from "@trinacria-cms/kernel/runtime";
import { EditorialJsonObjectSchema } from "../entries/editorial-json.js";
import { EntryBodySchema } from "../entries/structured-document.js";
import {
  type EditorialPreviewService,
  PreviewCredentialError,
  PreviewUnavailableError
} from "./preview.service.js";

const site = s.string({ pattern: /^[a-z][a-z0-9-]{0,79}$/ });
const issueSchema = s.object({ siteId: site }, { strict: true });
const exchangeSchema = s.object(
  {
    token: s.string({ minLength: 1, maxLength: 4096 }),
    siteId: site,
    origin: s.string({ maxLength: 300 })
  },
  { strict: true }
);
const result = s.object(
  {
    id: s.string(),
    contentTypeKey: s.string(),
    title: s.string().optional(),
    slug: s.string().optional(),
    body: EntryBodySchema.optional(),
    data: EditorialJsonObjectSchema
  },
  { strict: true }
);
const privateHeaders = {
  "cache-control": "private, no-store",
  "x-robots-tag": "noindex, nofollow",
  "referrer-policy": "no-referrer"
};
export class EditorialPreviewController extends HttpController {
  private readonly authenticated;
  constructor(
    private readonly preview: EditorialPreviewService,
    auth: JwtAuthService,
    private readonly limiter: { consume(clientId: string): Promise<void> }
  ) {
    super();
    this.authenticated = createJwtAuthMiddleware(auth, { requireAdmin: false });
  }
  routes() {
    const docs = (
      operationId: string,
      schema: Record<string, unknown>,
      input?: Record<string, unknown>,
      admin = false
    ): RouteOpenApiDocs => ({
      operationId,
      pluginId: "editorial-pack",
      tags: ["Preview"],
      summary: operationId,
      security: admin ? [{ bearerAuth: [] }, { cookieAuth: [] }] : [],
      description:
        "No-store preview. Session requests require Authorization: Preview <opaque-session>, X-Preview-Site and Origin. No access JWT is sent to the public site.",
      ...(input ? { requestBody: { required: true, schema: input } } : {}),
      ...(!input && !admin
        ? {
            parameters: [
              {
                name: "Authorization",
                in: "header" as const,
                required: true,
                schema: { type: "string" }
              },
              {
                name: "X-Preview-Site",
                in: "header" as const,
                required: true,
                schema: { type: "string" }
              },
              { name: "Origin", in: "header" as const, required: true, schema: { type: "string" } }
            ]
          }
        : {}),
      responses: {
        200: {
          description: "Preview result",
          schema: { type: "object", required: ["data"], properties: { data: schema } }
        },
        400: { description: "Invalid input" },
        401: { description: "Expired or invalid credential" },
        403: { description: "Entry permission required" },
        429: { description: "Request budget exceeded" },
        503: { description: "Preview unavailable" }
      }
    });
    return this.router()
      .get("/v1/editorial/preview-sites", this.sites, {
        middlewares: [this.authenticated],
        docs: docs(
          "listEditorialPreviewSites",
          s.array(s.object({ siteId: s.string(), origin: s.string() })).toOpenApi(),
          undefined,
          true
        )
      })
      .post("/v1/editorial/entries/:id/preview-tokens", this.issue, {
        middlewares: [this.authenticated],
        docs: docs(
          "createEditorialPreviewToken",
          s
            .object({
              token: s.string(),
              entryId: s.string(),
              siteId: s.string(),
              formAction: s.string(),
              expiresAt: s.dateTimeString()
            })
            .toOpenApi(),
          issueSchema.toOpenApi(),
          true
        )
      })
      .post("/v1/preview/sessions", this.exchange, {
        docs: docs(
          "createPreviewSession",
          s
            .object({ sessionId: s.string(), entryId: s.string(), expiresAt: s.dateTimeString() })
            .toOpenApi(),
          exchangeSchema.toOpenApi()
        )
      })
      .get("/v1/preview/entries/:id", this.read, {
        docs: docs("getPreviewEntry", result.toOpenApi())
      })
      .delete("/v1/preview/sessions/current", this.revoke, {
        docs: docs("revokePreviewSession", s.object({ revoked: s.boolean() }).toOpenApi())
      })
      .build();
  }
  private scope(ctx: HttpContext) {
    const auth = ctx.req.headers.authorization,
      origin = ctx.req.headers.origin,
      siteId = ctx.req.headers["x-preview-site"];
    if (
      typeof auth !== "string" ||
      !auth.startsWith("Preview ") ||
      typeof origin !== "string" ||
      typeof siteId !== "string"
    )
      throw new PreviewCredentialError("Preview credential required");
    return { sessionId: auth.slice(8), origin, siteId: site.parse(siteId) };
  }
  private async execute(ctx: HttpContext, work: () => Promise<unknown>) {
    try {
      await this.limiter.consume(ctx.req.socket.remoteAddress ?? "unknown-peer");
      return response({ data: await work() }, { headers: privateHeaders });
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error ? error.code : "service_unavailable";
      const status =
        error instanceof PreviewCredentialError
          ? 401
          : error instanceof ValidationError || code === "validation_error"
            ? 400
            : code === "operation_forbidden"
              ? 403
              : code === "rate_limited"
                ? 429
                : 503;
      const message =
        status === 503 || error instanceof PreviewUnavailableError
          ? "Preview temporarily unavailable"
          : "Preview request rejected";
      return response(apiError(status === 503 ? "service_unavailable" : String(code), message), {
        status,
        headers: { ...privateHeaders, ...(status === 429 ? { "retry-after": "60" } : {}) }
      });
    }
  }
  private issue = (ctx: HttpContext) =>
    this.execute(ctx, async () => {
      const input = issueSchema.parse(ctx.body);
      return this.preview.issue(getHttpOperationContext(ctx), ctx.params.id!, input.siteId);
    });
  private sites = (ctx: HttpContext) =>
    this.execute(ctx, () => this.preview.sites(getHttpOperationContext(ctx)));
  private exchange = (ctx: HttpContext) =>
    this.execute(ctx, async () => {
      const input = exchangeSchema.parse(ctx.body);
      if (ctx.req.headers.origin !== input.origin)
        throw new PreviewCredentialError("Preview origin mismatch");
      return this.preview.exchange(input.token, input.siteId, input.origin);
    });
  private read = (ctx: HttpContext) =>
    this.execute(ctx, async () => {
      s.object({}, { strict: true }).parse(ctx.query);
      const input = this.scope(ctx);
      return this.preview.read(input.sessionId, input.siteId, input.origin, ctx.params.id!);
    });
  private revoke = (ctx: HttpContext) =>
    this.execute(ctx, async () => {
      const input = this.scope(ctx);
      return this.preview.revoke(input.sessionId, input.siteId, input.origin);
    });
}
