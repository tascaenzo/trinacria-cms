import { type HttpContext, HttpController, response } from "@trinacria/http";
import { s } from "@trinacria/schema";
import { apiError } from "../../contracts/api-contract.js";
import type { OperationAuthorizer } from "../../contracts/operations.js";
import type { MongoDurableEventStore } from "../../runtime/durable-events/durable-events.js";
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
  "dead-letter",
  "cancelled"
] as const;
const querySchema = s.object(
  {
    ownerPluginId: s.string({ maxLength: 120 }).optional(),
    consumerPluginId: s.string({ maxLength: 120 }).optional(),
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
    consumerPluginId: s.string(),
    handlerName: s.string(),
    handlerVersion: s.string(),
    eventName: s.string(),
    payloadVersion: s.number(),
    status: s.enum(statuses),
    attempt: s.number(),
    epoch: s.number(),
    createdAt: s.dateTimeString(),
    availableAt: s.dateTimeString(),
    leaseOwner: s.string().optional(),
    leaseUntil: s.dateTimeString().optional(),
    partitionKey: s.string().optional(),
    sequence: s.number().optional(),
    reason: s.string().optional(),
    completedAt: s.dateTimeString().optional(),
    purgeAt: s.dateTimeString().optional()
  },
  { strict: true }
);
export class KernelDeliveriesController extends HttpController {
  private readonly operations;
  constructor(
    store: MongoDurableEventStore,
    authorizer: OperationAuthorizer,
    private readonly guard: import("../../contracts/kernel-admin-route-guard.js").KernelAdminRouteGuard
  ) {
    super();
    const read = { ownerPluginId: "core-pack", resource: "deliveries", action: "read" };
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
        403: { description: "Delivery permission required" }
      }
    });
    router.get("/v1/system/deliveries", this.list, {
      middlewares: [this.guard.middleware],
      docs: {
        ...docs("listEventDeliveries", "List redacted event deliveries", {
          type: "array",
          items: toOpenApiSchema(deliverySchema)
        }),
        parameters: [
          "ownerPluginId",
          "consumerPluginId",
          "eventId",
          "status",
          "limit",
          "offset"
        ].map((name) => ({
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
    router.get("/v1/system/deliveries/:deliveryId", this.get, {
      middlewares: [this.guard.middleware],
      docs: docs(
        "getEventDelivery",
        "Read a redacted event delivery",
        toOpenApiSchema(deliverySchema)
      )
    });
    for (const action of ["retry", "cancel"] as const)
      router.post(
        `/v1/system/deliveries/:deliveryId/${action}`,
        (ctx) => this.decide(ctx, action),
        {
          middlewares: [this.guard.middleware],
          docs: {
            ...docs(
              action === "retry" ? "retryEventDelivery" : "cancelEventDelivery",
              "Submit audited delivery decision",
              toOpenApiSchema(deliverySchema)
            ),
            requestBody: { required: true, schema: toOpenApiSchema(decisionSchema) }
          }
        }
      );
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
        parsePathParam(ctx.params, "deliveryId") ?? ""
      );
      return result
        ? responder.success(result)
        : response(apiError("not_found", "Delivery not found"), { status: 404 });
    } catch (error) {
      return responder.fromError(error);
    }
  };
  private async decide(ctx: HttpContext, action: "retry" | "cancel") {
    try {
      const input = decisionSchema.parse(ctx.body);
      return responder.success(
        await this.operations.decide(
          getHttpOperationContext(ctx),
          parsePathParam(ctx.params, "deliveryId") ?? "",
          action,
          input.expectedEpoch,
          "",
          input.reason
        )
      );
    } catch (error) {
      return responder.fromError(error);
    }
  }
}
