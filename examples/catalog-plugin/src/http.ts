import { createJwtAuthMiddleware, type JwtAuthService } from "@trinacria-cms/core-pack";
import {
  createPluginApiResponder,
  type HttpContext,
  HttpController,
  s
} from "@trinacria-cms/kernel";
import type { ApplicationOperations } from "@trinacria-cms/kernel/contracts";
import { getHttpOperationContext } from "@trinacria-cms/kernel/runtime";
import { ITEM, ITEM_INPUT } from "./contracts.js";
import type { CatalogService } from "./service.js";
export type CatalogOperations = ApplicationOperations<
  Pick<CatalogService, "list" | "get" | "create" | "update" | "remove">
>;
const reply = createPluginApiResponder("catalog-plugin");
const update = s.object(
  { expectedVersion: s.number({ int: true, min: 1 }), input: ITEM_INPUT },
  { strict: true }
);
export class CatalogController extends HttpController {
  constructor(
    private readonly operations: CatalogOperations,
    private readonly auth: JwtAuthService
  ) {
    super();
  }
  routes() {
    const router = this.router(),
      middlewares = [createJwtAuthMiddleware(this.auth, { requireAdmin: false })];
    const docs = (
      operationId: string,
      schema: Record<string, unknown>,
      body?: Record<string, unknown>
    ) => ({
      pluginId: "catalog-plugin",
      operationId,
      tags: ["Catalog"],
      summary: operationId,
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Catalog result",
          schema: { type: "object", required: ["data"], properties: { data: schema } }
        },
        400: { description: "Invalid input" },
        401: { description: "Authentication required" },
        403: { description: "Catalog permission required" },
        409: { description: "Version conflict" }
      },
      ...(body ? { requestBody: { required: true, schema: body } } : {})
    });
    router.get(
      "/v1/catalog/items",
      (ctx) =>
        this.execute(ctx, async () =>
          reply.list(
            await this.operations.list(
              getHttpOperationContext(ctx),
              ctx.query.limit === undefined ? 50 : Number(ctx.query.limit),
              ctx.query.offset === undefined ? 0 : Number(ctx.query.offset)
            )
          )
        ),
      {
        middlewares,
        docs: {
          ...docs("listCatalogItems", { type: "array", items: ITEM.toOpenApi() }),
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
            { name: "offset", in: "query", schema: { type: "integer", minimum: 0, maximum: 10000 } }
          ]
        }
      }
    );
    router.get(
      "/v1/catalog/items/:id",
      (ctx) =>
        this.execute(ctx, async () => {
          const item = await this.operations.get(getHttpOperationContext(ctx), ctx.params.id!);
          return item ? reply.success(item) : reply.notFound("Catalog item not found");
        }),
      { middlewares, docs: docs("getCatalogItem", ITEM.toOpenApi()) }
    );
    router.post(
      "/v1/catalog/items",
      (ctx) =>
        this.execute(ctx, async () =>
          reply.success(
            await this.operations.create(getHttpOperationContext(ctx), ITEM_INPUT.parse(ctx.body))
          )
        ),
      { middlewares, docs: docs("createCatalogItem", ITEM.toOpenApi(), ITEM_INPUT.toOpenApi()) }
    );
    router.patch(
      "/v1/catalog/items/:id",
      (ctx) =>
        this.execute(ctx, async () => {
          const input = update.parse(ctx.body);
          return reply.success(
            await this.operations.update(
              getHttpOperationContext(ctx),
              ctx.params.id!,
              input.expectedVersion,
              input.input
            )
          );
        }),
      { middlewares, docs: docs("updateCatalogItem", ITEM.toOpenApi(), update.toOpenApi()) }
    );
    router.delete(
      "/v1/catalog/items/:id",
      (ctx) =>
        this.execute(ctx, async () => {
          const input = s
            .object({ expectedVersion: s.number({ int: true, min: 1 }) }, { strict: true })
            .parse(ctx.body);
          return reply.success(
            await this.operations.remove(
              getHttpOperationContext(ctx),
              ctx.params.id!,
              input.expectedVersion
            )
          );
        }),
      {
        middlewares,
        docs: docs(
          "deleteCatalogItem",
          { type: "object", required: ["deleted"], properties: { deleted: { type: "boolean" } } },
          {
            type: "object",
            required: ["expectedVersion"],
            additionalProperties: false,
            properties: { expectedVersion: { type: "integer", minimum: 1 } }
          }
        )
      }
    );
    return router.build();
  }
  private async execute(_ctx: HttpContext, work: () => Promise<unknown>) {
    try {
      return await work();
    } catch (error) {
      return reply.fromError(error);
    }
  }
}
