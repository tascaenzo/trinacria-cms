import {
  createPluginApiResponder,
  parsePathParam,
  parseQueryNumber,
  toOpenApiSchema
} from "./api-http-utils.js";
import { apiError } from "../contracts/api-contract.js";
import type { KernelAdminRouteGuard } from "../contracts/kernel-admin-route-guard.js";
import { HttpController, response, type HttpContext } from "@trinacria/http";
import type { KernelSystemService } from "../runtime/kernel-system-service.js";
import {
  PluginDependencyError,
  PluginLifecycleError,
  PluginRuntimeError,
  PluginStateTransitionError
} from "../errors/plugin-errors.js";
import {
  GetInstalledPluginResponseSchema,
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

/**
 * Built-in kernel HTTP controller exposing runtime discovery for SDKs and
 * operational tooling.
 */
export class KernelSystemHttpController extends HttpController {
  constructor(
    private readonly system: KernelSystemService,
    private readonly adminRouteGuard: KernelAdminRouteGuard | null = null
  ) {
    super();
  }

  routes() {
    const guardedMiddlewares = this.adminRouteGuard ? [this.adminRouteGuard.middleware] : [];
    const guardedSecurity = this.adminRouteGuard?.security;

    return this.router()
      .get("/v1/system/plugins", this.listInstalledPlugins, {
        middlewares: guardedMiddlewares,
        docs: {
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
      .get("/v1/system/plugins/sources", this.listPluginSources, {
        middlewares: guardedMiddlewares,
        docs: {
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
          summary: "Execute a supported runtime operation on one installed plugin",
          tags: ["System"],
          operationId: "executePluginOperation",
          ...(guardedSecurity ? { security: guardedSecurity } : {}),
          requestBody: {
            required: true,
            schema: toOpenApiSchema(PluginOperationRequestSchema)
          },
          responses: {
            200: {
              description: "Plugin operation result",
              schema: toOpenApiSchema(PluginOperationResponseSchema)
            }
          }
        }
      })
      .get("/v1/system/plugins/:pluginId/events", this.listPluginEvents, {
        middlewares: guardedMiddlewares,
        docs: {
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

  private listInstalledPlugins = async () => {
    return responder.list(this.system.listInstalledPlugins());
  };

  private listCapabilities = async () => {
    return responder.list(this.system.listCapabilities());
  };

  private listPluginContributions = async () => {
    return responder.success(this.system.listPluginContributions());
  };

  private listPluginSources = async () => {
    return responder.list(this.system.listPluginSources());
  };

  private getInstalledPlugin = async (ctx: HttpContext) => {
    const pluginId = parsePathParam(ctx.params, "pluginId");
    if (!pluginId) {
      return responder.invalidRequest("Missing plugin id");
    }

    const snapshot = this.system.getInstalledPlugin(pluginId);
    if (!snapshot) {
      return responder.notFound(`Plugin "${pluginId}" not found`);
    }

    return responder.success(snapshot);
  };

  private executePluginOperation = async (ctx: HttpContext) => {
    const pluginId = parsePathParam(ctx.params, "pluginId");
    if (!pluginId) {
      return responder.invalidRequest("Missing plugin id");
    }

    try {
      const payload = PluginOperationRequestSchema.parse(ctx.body);
      const result = await this.system.executeOperation(pluginId, payload);
      return responder.success(result);
    } catch (error) {
      return this.fromPluginOperationError(pluginId, error);
    }
  };

  private listPluginEvents = async (ctx: HttpContext) => {
    const pluginId = parsePathParam(ctx.params, "pluginId");
    if (!pluginId) {
      return responder.invalidRequest("Missing plugin id");
    }

    const snapshot = this.system.getInstalledPlugin(pluginId);
    if (!snapshot) {
      return responder.notFound(`Plugin "${pluginId}" not found`);
    }

    const requestedLimit = parseQueryNumber(ctx.query.limit);
    const limit =
      requestedLimit === undefined
        ? undefined
        : Math.min(200, Math.max(1, Math.floor(requestedLimit)));

    return responder.list(this.system.listPluginEvents(pluginId, limit));
  };

  private fromPluginOperationError(pluginId: string, error: unknown) {
    const snapshot = this.system.getInstalledPlugin(pluginId);
    const recentEvents = this.system.listPluginEvents(pluginId, 5);
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
