import { type HttpContext, HttpController, response } from "@trinacria/http";
import { s } from "@trinacria/schema";
import { apiError } from "../../contracts/api-contract.js";
import type { OperationAuthorizer } from "../../contracts/operations.js";
import type { SecureEmailJobStore } from "../../runtime/durable-events/secure-email-jobs.js";
import { createApplicationOperations } from "../../runtime/operations/application-operations.js";
import {
  getHttpOperationContext,
  operationForbidden,
  operationSubjectId
} from "../../runtime/operations/operation-context.js";
import { createPluginApiResponder, parsePathParam, toOpenApiSchema } from "../api-http-utils.js";

const responder = createPluginApiResponder("kernel");
const statuses = [
  "pending",
  "running",
  "retry",
  "succeeded",
  "blocked",
  "ambiguous",
  "cancelled"
] as const;
const querySchema = s.object(
  {
    ownerPluginId: s.string({ maxLength: 120 }).optional(),
    eventId: s.string({ maxLength: 300 }).optional(),
    status: s.enum(statuses).optional(),
    limit: s.number({ int: true, min: 1, max: 100 }).optional(),
    offset: s.number({ int: true, min: 0, max: 10000 }).optional()
  },
  { strict: true }
);
const decisionSchema = s.object(
  {
    expectedEpoch: s.number({ int: true, min: 0 }),
    reason: s.string({ trim: true, minLength: 1, maxLength: 500 })
  },
  { strict: true }
);
const deliverySchema = s.object(
  {
    id: s.string(),
    eventId: s.string(),
    ownerPluginId: s.string(),
    consumerPluginId: s.literal("email-pack"),
    expiresAt: s.dateTimeString(),
    status: s.enum(statuses),
    attempt: s.number(),
    epoch: s.number(),
    createdAt: s.dateTimeString(),
    availableAt: s.dateTimeString(),
    leaseOwner: s.string().optional(),
    leaseUntil: s.dateTimeString().optional(),
    reason: s.string().optional(),
    purgeAt: s.dateTimeString().optional()
  },
  { strict: true }
);
export class KernelEmailJobsController extends HttpController {
  private readonly operations;
  constructor(
    store: SecureEmailJobStore,
    authorizer: OperationAuthorizer,
    private readonly guard: import("../../contracts/kernel-admin-route-guard.js").KernelAdminRouteGuard
  ) {
    super();
    const read = { ownerPluginId: "core-pack", resource: "email-jobs", action: "read" };
    this.operations = createApplicationOperations(store, authorizer, {
      list: { target: read },
      get: { target: read },
      decide: {
        target: { ...read, action: "manage" },
        prepare: (args, context) => {
          if (context.actor.kind !== "user") throw operationForbidden("user_required");
          return [args[0], args[1], args[2], operationSubjectId(context), args[4]];
        }
      }
    });
  }
  routes() {
    const router = this.router();
    const docs = (operationId: string, summary: string, schema: Record<string, unknown>) => ({
      pluginId: "kernel",
      operationId,
      summary,
      tags: ["System"],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: summary,
          schema: {
            type: "object",
            required: ["data"],
            properties: { data: schema, meta: { type: "object", additionalProperties: true } }
          }
        },
        403: { description: "Email job permission required" }
      }
    });
    router.get("/v1/system/email-jobs", this.list, {
      middlewares: [this.guard.middleware],
      docs: {
        ...docs("listSecureEmailJobs", "List redacted secure email jobs", {
          type: "array",
          items: toOpenApiSchema(deliverySchema)
        }),
        parameters: ["ownerPluginId", "eventId", "status", "limit", "offset"].map((name) => ({
          name,
          in: "query" as const,
          schema:
            name === "limit"
              ? { type: "integer", minimum: 1, maximum: 100 }
              : name === "offset"
                ? { type: "integer", minimum: 0, maximum: 10000 }
                : name === "status"
                  ? { type: "string", enum: [...statuses] }
                  : { type: "string" }
        }))
      }
    });
    router.get("/v1/system/email-jobs/:jobId", this.get, {
      middlewares: [this.guard.middleware],
      docs: docs(
        "getSecureEmailJob",
        "Read a redacted secure email job",
        toOpenApiSchema(deliverySchema)
      )
    });
    for (const action of ["retry", "cancel"] as const)
      router.post(`/v1/system/email-jobs/:jobId/${action}`, (ctx) => this.decide(ctx, action), {
        middlewares: [this.guard.middleware],
        docs: {
          ...docs(
            action === "retry" ? "retrySecureEmailJob" : "cancelSecureEmailJob",
            "Submit audited email job decision",
            toOpenApiSchema(deliverySchema)
          ),
          requestBody: { required: true, schema: toOpenApiSchema(decisionSchema) }
        }
      });
    return router.build();
  }
  private list = async (ctx: HttpContext) => {
    try {
      return responder.list(
        await this.operations.list(
          getHttpOperationContext(ctx),
          querySchema.parse({
            ...ctx.query,
            ...(ctx.query.limit === undefined ? {} : { limit: Number(ctx.query.limit) }),
            ...(ctx.query.offset === undefined ? {} : { offset: Number(ctx.query.offset) })
          })
        )
      );
    } catch (error) {
      return responder.fromError(error);
    }
  };
  private get = async (ctx: HttpContext) => {
    try {
      const result = await this.operations.get(
        getHttpOperationContext(ctx),
        parsePathParam(ctx.params, "jobId") ?? ""
      );
      return result
        ? responder.success(result)
        : response(apiError("not_found", "Email job not found"), { status: 404 });
    } catch (error) {
      return responder.fromError(error);
    }
  };
  private async decide(ctx: HttpContext, action: "retry" | "cancel") {
    try {
      const input = decisionSchema.parse(ctx.body);
      await this.operations.decide(
        getHttpOperationContext(ctx),
        parsePathParam(ctx.params, "jobId") ?? "",
        input.expectedEpoch,
        action,
        "",
        input.reason
      );
      return responder.success(
        await this.operations.get(
          getHttpOperationContext(ctx),
          parsePathParam(ctx.params, "jobId") ?? ""
        )
      );
    } catch (error) {
      return responder.fromError(error);
    }
  }
}
