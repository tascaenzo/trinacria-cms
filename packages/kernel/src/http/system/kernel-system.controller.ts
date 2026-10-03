import { type HttpContext, HttpController, type HttpMiddleware, response } from "@trinacria/http";
import { apiError } from "../../contracts/api-contract.js";
import type { KernelAdminRouteGuard } from "../../contracts/kernel-admin-route-guard.js";
import {
  PluginDependencyError,
  PluginLifecycleError,
  PluginRuntimeError,
  PluginStateTransitionError
} from "../../errors/plugin-errors.js";
import type { KernelSystemOperations } from "../../runtime/operations/kernel-system-operations.js";
import { getHttpOperationContext } from "../../runtime/operations/operation-context.js";
import {
  createPluginApiResponder,
  parsePathParam,
  parseQueryNumber,
  toOpenApiSchema
} from "../api-http-utils.js";
import {
  GetInstalledPluginResponseSchema,
  ListAdminExtensionsResponseSchema,
  ListCapabilitiesResponseSchema,
  ListInstalledPluginsResponseSchema,
  ListPluginContributionsResponseSchema,
  ListPluginSourcesResponseSchema,
  PluginEventsQueryParameters,
  PluginEventsResponseSchema,
  PluginOperationRequestSchema,
  PluginOperationResponseSchema
} from "./kernel-system.schemas.js";

const responder = createPluginApiResponder("kernel");

export class KernelSystemHttpController extends HttpController {
  constructor(
    private readonly system: KernelSystemOperations,
    private readonly adminRouteGuard: KernelAdminRouteGuard | null = null
  ) {
    super();
  }

  routes() {
    const guardedMiddlewares = [this.adminRouteGuard?.middleware ?? denyMissingAdminRouteGuard];
    const guardedSecurity = this.adminRouteGuard?.security;

    return this.router()
      .get("/v1/system/plugins", this.listInstalledPlugins, {
        middlewares: guardedMiddlewares,
        docs: {
          pluginId: "kernel",
          summary: "List installed plugins and their runtime state",
          tags: ["System"],
          operationId: "listInstalledPlugins",
          ...(guardedSecurity ? { security: guardedSecurity } : {}),
          responses: {
            200: {
              description: "Installed plugin discovery snapshot",
              schema: toOpenApiSchema(ListInstalledPluginsResponseSchema)
            }
          }
        }
      })
      .get("/v1/system/capabilities", this.listCapabilities, {
        middlewares: guardedMiddlewares,
        docs: {
          pluginId: "kernel",
          summary: "List published capabilities across installed plugins",
          tags: ["System"],
          operationId: "listInstalledCapabilities",
          ...(guardedSecurity ? { security: guardedSecurity } : {}),
          responses: {
            200: {
              description: "Flattened capability catalog",
              schema: toOpenApiSchema(ListCapabilitiesResponseSchema)
            }
          }
        }
      })
      .get("/v1/system/plugin-contributions", this.listPluginContributions, {
        middlewares: guardedMiddlewares,
        docs: {
          pluginId: "kernel",
          summary: "List manifest-derived plugin contributions",
          tags: ["System"],
          operationId: "listPluginContributions",
          ...(guardedSecurity ? { security: guardedSecurity } : {}),
          responses: {
            200: {
              description: "Manifest-derived plugin contribution catalog",
              schema: toOpenApiSchema(ListPluginContributionsResponseSchema)
            }
          }
        }
      })
      .get("/v1/admin/extensions", this.listAdminExtensions, {
        middlewares: guardedMiddlewares,
        docs: {
          pluginId: "kernel",
          summary: "List runtime admin extension manifests for loaded plugins",
          tags: ["System"],
          operationId: "listAdminExtensions",
          ...(guardedSecurity ? { security: guardedSecurity } : {}),
          responses: {
            200: {
              description: "Runtime admin extension manifests",
              schema: toOpenApiSchema(ListAdminExtensionsResponseSchema)
            }
          }
        }
      })
      .get("/v1/system/plugins/sources", this.listPluginSources, {
        middlewares: guardedMiddlewares,
        docs: {
          pluginId: "kernel",
          summary: "List configured plugin discovery sources",
          tags: ["System"],
          operationId: "listPluginSources",
          ...(guardedSecurity ? { security: guardedSecurity } : {}),
          responses: {
            200: {
              description: "Configured plugin discovery source diagnostics",
              schema: toOpenApiSchema(ListPluginSourcesResponseSchema)
            }
          }
        }
      })
      .get("/v1/system/plugins/:pluginId", this.getInstalledPlugin, {
        middlewares: guardedMiddlewares,
        docs: {
          pluginId: "kernel",
          summary: "Read one installed plugin snapshot",
          tags: ["System"],
          operationId: "getInstalledPlugin",
          ...(guardedSecurity ? { security: guardedSecurity } : {}),
          responses: {
            200: {
              description: "Installed plugin detail snapshot",
              schema: toOpenApiSchema(GetInstalledPluginResponseSchema)
            }
          }
        }
      })
      .post("/v1/system/plugins/:pluginId/operations", this.executePluginOperation, {
        middlewares: guardedMiddlewares,
        docs: {
          pluginId: "kernel",
          summary: "Execute a plugin lifecycle operation locally or through the configured cluster",
          tags: ["System"],
          operationId: "executePluginOperation",
          ...(guardedSecurity ? { security: guardedSecurity } : {}),
          requestBody: {
            required: true,
            schema: toOpenApiSchema(PluginOperationRequestSchema)
          },
          responses: {
            202: {
              description: "Plugin lifecycle operation accepted",
              schema: toOpenApiSchema(PluginOperationResponseSchema)
            }
          }
        }
      })
      .get("/v1/system/plugin-operations/:operationId", this.getPluginOperation, {
        middlewares: guardedMiddlewares,
        docs: {
          pluginId: "kernel",
          operationId: "getPluginOperation",
          summary: "Read local or cluster plugin operation status",
          tags: ["System"],
          ...(guardedSecurity ? { security: guardedSecurity } : {}),
          responses: {
            200: {
              description: "Plugin lifecycle operation status",
              schema: toOpenApiSchema(PluginOperationResponseSchema)
            }
          }
        }
      })
      .get("/v1/system/plugins/:pluginId/events", this.listPluginEvents, {
        middlewares: guardedMiddlewares,
        docs: {
          pluginId: "kernel",
          summary: "Read recent lifecycle events for one installed plugin",
          tags: ["System"],
          operationId: "listPluginEvents",
          ...(guardedSecurity ? { security: guardedSecurity } : {}),
          parameters: [...PluginEventsQueryParameters],
          responses: {
            200: {
              description: "Recent plugin lifecycle events",
              schema: toOpenApiSchema(PluginEventsResponseSchema)
            }
          }
        }
      })
      .build();
  }

  private listInstalledPlugins = async (ctx: HttpContext) => {
    try {
      return responder.list(await this.system.listInstalledPlugins(getHttpOperationContext(ctx)));
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private listCapabilities = async (ctx: HttpContext) => {
    try {
      return responder.list(await this.system.listCapabilities(getHttpOperationContext(ctx)));
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private listPluginContributions = async (ctx: HttpContext) => {
    try {
      return responder.success(
        await this.system.listPluginContributions(getHttpOperationContext(ctx))
      );
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private listAdminExtensions = async (ctx: HttpContext) => {
    try {
      return responder.list(await this.system.listAdminExtensions(getHttpOperationContext(ctx)));
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private listPluginSources = async (ctx: HttpContext) => {
    try {
      return responder.list(await this.system.listPluginSources(getHttpOperationContext(ctx)));
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private getInstalledPlugin = async (ctx: HttpContext) => {
    const pluginId = parsePathParam(ctx.params, "pluginId");
    if (!pluginId) {
      return responder.invalidRequest("Missing plugin id");
    }

    const snapshot = await this.system.getInstalledPlugin(getHttpOperationContext(ctx), pluginId);
    if (!snapshot) {
      return responder.notFound(`Plugin "${pluginId}" not found`);
    }

    return responder.success(snapshot);
  };

  private getPluginOperation = async (ctx: HttpContext) => {
    try {
      return responder.success(
        await this.system.getPluginOperation(
          getHttpOperationContext(ctx),
          parsePathParam(ctx.params, "operationId") ?? ""
        )
      );
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private executePluginOperation = async (ctx: HttpContext) => {
    const pluginId = parsePathParam(ctx.params, "pluginId");
    if (!pluginId) {
      return responder.invalidRequest("Missing plugin id");
    }

    try {
      const payload = PluginOperationRequestSchema.parse(ctx.body);
      const result = await this.system.executeOperation(
        getHttpOperationContext(ctx),
        pluginId,
        payload,
        ""
      );
      return response(responder.success(result), { status: 202 });
    } catch (error) {
      return this.fromPluginOperationError(ctx, pluginId, error);
    }
  };

  private listPluginEvents = async (ctx: HttpContext) => {
    const pluginId = parsePathParam(ctx.params, "pluginId");
    if (!pluginId) {
      return responder.invalidRequest("Missing plugin id");
    }

    const snapshot = await this.system.getInstalledPlugin(getHttpOperationContext(ctx), pluginId);
    if (!snapshot) {
      return responder.notFound(`Plugin "${pluginId}" not found`);
    }

    const requestedLimit = parseQueryNumber(ctx.query.limit);
    const limit =
      requestedLimit === undefined
        ? undefined
        : Math.min(200, Math.max(1, Math.floor(requestedLimit)));

    return responder.list(
      await this.system.listPluginEvents(getHttpOperationContext(ctx), pluginId, limit)
    );
  };

  private async fromPluginOperationError(ctx: HttpContext, pluginId: string, error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "operation_forbidden"
    )
      return responder.fromError(error);
    const snapshot = await this.system.getInstalledPlugin(getHttpOperationContext(ctx), pluginId);
    const recentEvents = await this.system.listPluginEvents(
      getHttpOperationContext(ctx),
      pluginId,
      5
    );
    const details = {
      ...(hasErrorDetails(error) ? error.details : {}),
      ...(snapshot ? { plugin: snapshot } : {}),
      ...(recentEvents.length > 0 ? { recentEvents } : {})
    };

    if (error instanceof PluginStateTransitionError || error instanceof PluginDependencyError) {
      return response(
        apiError("plugin_operation_not_allowed", error.message, details, {
          pluginId: "kernel"
        }),
        { status: 409 }
      );
    }

    if (error instanceof PluginRuntimeError || error instanceof PluginLifecycleError) {
      return response(
        apiError("plugin_operation_failed", error.message, details, {
          pluginId: "kernel"
        }),
        { status: 409 }
      );
    }

    return responder.fromError(error);
  }
}

function hasErrorDetails(error: unknown): error is { details?: Record<string, unknown> } {
  return Boolean(error && typeof error === "object" && "details" in error);
}

const denyMissingAdminRouteGuard: HttpMiddleware = async () => {
  return response(
    apiError(
      "admin_route_guard_required",
      "Kernel system endpoints require an admin route guard provider",
      undefined,
      { pluginId: "kernel" }
    ),
    { status: 403 }
  );
};
