import {
  createPluginApiResponder,
  type HttpContext,
  HttpController,
  type Schema,
  s,
  toOpenApiSchema
} from "@trinacria-cms/kernel";
import { getHttpOperationContext } from "@trinacria-cms/kernel/runtime";
import type { PluginGrantOperations } from "../../../operations/plugin-grant-operations.js";
import { createJwtAuthMiddleware } from "../../auth/auth.middleware.js";
import type { JwtAuthService } from "../../auth/services/auth.service.js";

const grantSchema = s.object(
  {
    id: s.string(),
    accessType: s.literal("api"),
    producerPluginId: s.string(),
    consumerPluginId: s.string(),
    target: s.string(),
    resource: s.string().optional(),
    action: s.string().optional(),
    operation: s.string().optional(),
    payloadType: s.string(),
    workspaceId: s.string(),
    requiredPermission: s.string(),
    status: s.enum(["pending", "approved", "denied", "revoked"] as const),
    revision: s.number({ int: true, min: 1 }),
    reason: s.string().optional(),
    approvedBy: s.string().optional(),
    approvedAt: s.string().optional(),
    revokedAt: s.string().optional(),
    updatedAt: s.string()
  },
  { strict: true }
);
const decisionSchema = s.object(
  {
    expectedRevision: s.number({ int: true, min: 1 }),
    reason: s.string({ trim: true, minLength: 1, maxLength: 500 })
  },
  { strict: true }
);
const envelope = (data: Schema<unknown>) => ({
  type: "object",
  required: ["data"],
  properties: { data: toOpenApiSchema(data), meta: { type: "object", additionalProperties: true } }
});
const responder = createPluginApiResponder("core-pack");
export class PluginGrantsController extends HttpController {
  private readonly authMiddleware;
  constructor(
    private readonly grants: PluginGrantOperations,
    auth: JwtAuthService
  ) {
    super();
    this.authMiddleware = createJwtAuthMiddleware(auth);
  }
  routes() {
    const docs = (id: string, schema: Schema<unknown>) => ({
      pluginId: "core-pack",
      operationId: id,
      summary: id,
      tags: ["Security"],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Grant result", schema: envelope(schema) },
        409: { description: "Revision conflict" },
        403: { description: "Permission required" }
      }
    });
    const route = this.router()
      .get("/v1/security/plugin-grants", this.list, {
        middlewares: [this.authMiddleware],
        docs: {
          ...docs("listPluginGrants", s.array(grantSchema)),
          parameters: [
            {
              name: "limit",
              in: "query" as const,
              schema: { type: "integer", minimum: 1, maximum: 100, default: 100 }
            },
            {
              name: "offset",
              in: "query" as const,
              schema: { type: "integer", minimum: 0, default: 0 }
            }
          ]
        }
      })
      .get("/v1/security/plugin-grants/:id", this.get, {
        middlewares: [this.authMiddleware],
        docs: docs("getPluginGrant", grantSchema)
      });
    for (const [action, status] of [
      ["approve", "approved"],
      ["deny", "denied"],
      ["revoke", "revoked"]
    ] as const)
      route.post(
        `/v1/security/plugin-grants/:id/${action}`,
        (ctx: HttpContext) => this.decide(ctx, status),
        {
          middlewares: [this.authMiddleware],
          docs: {
            ...docs(`${action}PluginGrant`, grantSchema),
            requestBody: { required: true, schema: toOpenApiSchema(decisionSchema) }
          }
        }
      );
    return route.build();
  }
  private list = async (ctx: HttpContext) => {
    try {
      const query = s
        .object(
          {
            limit: s.number({ int: true, min: 1, max: 100 }).optional(),
            offset: s.number({ int: true, min: 0 }).optional()
          },
          { strict: true }
        )
        .parse({
          ...(ctx.query.limit !== undefined ? { limit: Number(ctx.query.limit) } : {}),
          ...(ctx.query.offset !== undefined ? { offset: Number(ctx.query.offset) } : {})
        });
      return responder.list(
        await this.grants.list(getHttpOperationContext(ctx), query.limit, query.offset)
      );
    } catch (e) {
      return responder.fromError(e);
    }
  };
  private get = async (ctx: HttpContext) => {
    try {
      const grant = await this.grants.get(getHttpOperationContext(ctx), String(ctx.params.id));
      return grant ? responder.success(grant) : responder.notFound("Grant not found");
    } catch (e) {
      return responder.fromError(e);
    }
  };
  private async decide(ctx: HttpContext, status: "approved" | "denied" | "revoked") {
    try {
      const input = decisionSchema.parse(ctx.body);
      return responder.success(
        await this.grants.decide(
          getHttpOperationContext(ctx),
          String(ctx.params.id),
          status,
          input.expectedRevision,
          "",
          input.reason
        )
      );
    } catch (e) {
      return responder.fromError(e);
    }
  }
}
