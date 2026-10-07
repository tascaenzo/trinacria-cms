import {
  createPluginApiResponder,
  type HttpContext,
  HttpController,
  type OperationAuthorizer,
  s,
  toOpenApiSchema
} from "@trinacria-cms/kernel";
import {
  createApplicationOperations,
  getHttpOperationContext
} from "@trinacria-cms/kernel/runtime";
import { createJwtAuthMiddleware } from "../../auth/auth.middleware.js";
import type { JwtAuthService } from "../../auth/services/auth.service.js";
import type { SecurityAuditStore } from "./security-audit.js";

const responder = createPluginApiResponder("core-pack");
const querySchema = s.object(
  {
    ownerPluginId: s.string({ maxLength: 120 }).optional(),
    actorId: s.string({ maxLength: 120 }).optional(),
    since: s.dateTimeString().optional(),
    until: s.dateTimeString().optional(),
    limit: s.number({ int: true, min: 1, max: 100 }).optional(),
    offset: s.number({ int: true, min: 0, max: 10000 }).optional()
  },
  { strict: true }
);
const entrySchema = s.object(
  {
    id: s.string(),
    timestamp: s.string(),
    instanceId: s.string(),
    actorKind: s.enum(["user", "plugin", "system"] as const),
    actorId: s.string(),
    ownerPluginId: s.string(),
    action: s.string(),
    resourceId: s.string(),
    outcome: s.enum(["allowed", "denied", "failed"] as const),
    reason: s.string(),
    correlationId: s.string().optional(),
    revision: s.number().optional(),
    epoch: s.number().optional()
  },
  { strict: true }
);
export class SecurityAuditController extends HttpController {
  private readonly middleware;
  private readonly operations;
  constructor(store: SecurityAuditStore, authorizer: OperationAuthorizer, auth: JwtAuthService) {
    super();
    this.middleware = createJwtAuthMiddleware(auth);
    this.operations = createApplicationOperations(store, authorizer, {
      list: { target: { ownerPluginId: "core-pack", resource: "audit", action: "read" } }
    });
  }
  routes() {
    return this.router()
      .get("/v1/security/audit", this.list, {
        middlewares: [this.middleware],
        docs: {
          pluginId: "core-pack",
          operationId: "listSecurityAudit",
          summary: "Read redacted security audit",
          tags: ["Security"],
          security: [{ bearerAuth: [] }],
          parameters: ["ownerPluginId", "actorId", "since", "until", "limit", "offset"].map(
            (name) => ({
              name,
              in: "query" as const,
              schema:
                name === "limit"
                  ? { type: "integer", minimum: 1, maximum: 100 }
                  : name === "offset"
                    ? { type: "integer", minimum: 0, maximum: 10000 }
                    : { type: "string" }
            })
          ),
          responses: {
            200: {
              description: "Redacted audit records",
              schema: {
                type: "object",
                required: ["data"],
                properties: {
                  data: { type: "array", items: toOpenApiSchema(entrySchema) },
                  meta: { type: "object", additionalProperties: true }
                }
              }
            },
            403: { description: "Audit read permission required" }
          }
        }
      })
      .build();
  }
  private list = async (ctx: HttpContext) => {
    try {
      const query = {
        ...ctx.query,
        ...(ctx.query.limit !== undefined ? { limit: Number(ctx.query.limit) } : {}),
        ...(ctx.query.offset !== undefined ? { offset: Number(ctx.query.offset) } : {})
      };
      return responder.list(
        await this.operations.list(getHttpOperationContext(ctx), querySchema.parse(query))
      );
    } catch (error) {
      return responder.fromError(error);
    }
  };
}
