import { createPluginApiResponder, parsePathParam, toOpenApiSchema } from "./api-http-utils.js";
import { apiError } from "../contracts/api-contract.js";
import type { KernelAdminRouteGuard } from "../contracts/kernel-admin-route-guard.js";
import { HttpController, response, type HttpContext } from "@trinacria/http";
import { s } from "@trinacria/schema";
import type { KernelSystemService } from "../runtime/kernel-system-service.js";
import {
  PluginDependencyError,
  PluginLifecycleError,
  PluginRuntimeError,
  PluginStateTransitionError
} from "../errors/plugin-errors.js";

const responder = createPluginApiResponder("kernel");

/**
 * Response shape for a single installed plugin exposed by discovery endpoints.
 */
const KernelInstalledPluginSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    version: s.string({ trim: true, minLength: 1 }),
    requiresCore: s.string({ trim: true, minLength: 1 }),
    state: s.enum([
      "registered",
      "loading",
      "initializing",
      "loaded",
      "unloading",
      "failed",
      "disabled",
      "unloaded"
    ] as const),
    capabilities: s.array(s.string({ trim: true, minLength: 1 })),
    dependencies: s.array(
      s.object(
        {
          pluginId: s.string({ trim: true, minLength: 1 }),
          versionRange: s.string({ trim: true, minLength: 1 }),
          optional: s.boolean(),
          status: s.enum(["ok", "missing", "disabled", "version-mismatch"] as const),
          currentVersion: s.string({ trim: true, minLength: 1 }).optional(),
          state: s
            .enum([
              "registered",
              "loading",
              "initializing",
              "loaded",
              "unloading",
              "failed",
              "disabled",
              "unloaded"
            ] as const)
            .optional(),
          reason: s.string({ trim: true, minLength: 1 }).optional()
        },
        { strict: true }
      )
    ),
    security: s.object(
      {
        permissions: s.number({ int: true, min: 0 }),
        roles: s.number({ int: true, min: 0 }),
        grants: s.number({ int: true, min: 0 }),
        policyRules: s.number({ int: true, min: 0 })
      },
      { strict: true }
    ),
    failureCount: s.number({ int: true, min: 0 }),
    failedAt: s.dateTimeString().optional(),
    lastFailurePhase: s
      .enum(["register", "dependency-check", "load", "init", "unload", "rollback"] as const)
      .optional(),
    disabledAt: s.dateTimeString().optional(),
    disabledReason: s.string({ trim: true, minLength: 1 }).optional(),
    loadedAt: s.dateTimeString().optional(),
    statusReason: s
      .object(
        {
          code: s.string({ trim: true, minLength: 1 }),
          message: s.string({ trim: true, minLength: 1 })
        },
        { strict: false }
      )
      .optional(),
    lastError: s
      .object(
        {
          name: s.string({ trim: true, minLength: 1 }),
          message: s.string({ trim: true, minLength: 1 }),
          code: s.string({ trim: true, minLength: 1 }).optional()
        },
        { strict: false }
      )
      .optional(),
    operations: s.array(
      s.object(
        {
          operation: s.enum(["load", "unload", "reload", "disable", "enable"] as const),
          available: s.boolean(),
          reason: s.string({ trim: true, minLength: 1 }).optional()
        },
        { strict: true }
      )
    )
  },
  { strict: true }
);

/**
 * Response shape for one capability entry published by one installed plugin.
 */
const KernelCapabilitySchema = s.object(
  {
    pluginId: s.string({ trim: true, minLength: 1 }),
    capability: s.string({ trim: true, minLength: 1 }),
    version: s.string({ trim: true, minLength: 1 }),
    state: s.enum([
      "registered",
      "loading",
      "initializing",
      "loaded",
      "unloading",
      "failed",
      "disabled",
      "unloaded"
    ] as const)
  },
  { strict: true }
);

const KernelSystemMetaSchema = s.object(
  {
    pluginId: s.literal("kernel").optional(),
    count: s.number({ int: true }).optional()
  },
  { strict: true }
);

const ListInstalledPluginsResponseSchema = s.object(
  {
    data: s.array(KernelInstalledPluginSchema),
    meta: KernelSystemMetaSchema.optional()
  },
  { strict: true }
);

const ListCapabilitiesResponseSchema = s.object(
  {
    data: s.array(KernelCapabilitySchema),
    meta: KernelSystemMetaSchema.optional()
  },
  { strict: true }
);

const PluginContributionSnapshotSchema = s.object(
  {
    pluginId: s.string({ trim: true, minLength: 1 }),
    key: s.string({ trim: true, minLength: 1 }),
    declaration: s.object({}, { strict: false })
  },
  { strict: true }
);

const PluginContributionCatalogSchema = s.object(
  {
    entities: s.array(PluginContributionSnapshotSchema),
    settings: s.array(PluginContributionSnapshotSchema),
    events: s.object(
      {
        emits: s.array(PluginContributionSnapshotSchema),
        subscribes: s.array(PluginContributionSnapshotSchema)
      },
      { strict: true }
    ),
    admin: s.object(
      {
        navigation: s.array(PluginContributionSnapshotSchema),
        routes: s.array(PluginContributionSnapshotSchema),
        resources: s.array(PluginContributionSnapshotSchema),
        widgets: s.array(PluginContributionSnapshotSchema),
        settingsSections: s.array(PluginContributionSnapshotSchema)
      },
      { strict: true }
    )
  },
  { strict: true }
);

const ListPluginContributionsResponseSchema = s.object(
  {
    data: PluginContributionCatalogSchema,
    meta: KernelSystemMetaSchema.optional()
  },
  { strict: true }
);

const PluginOperationRequestSchema = s.object(
  {
    operation: s.enum(["load", "unload", "reload", "disable", "enable"] as const),
    reason: s.string({ trim: true, minLength: 1, maxLength: 1000 }).optional()
  },
  { strict: true }
);

const PluginOperationResultSchema = s.object(
  {
    plugin: KernelInstalledPluginSchema,
    operation: s.enum(["load", "unload", "reload", "disable", "enable"] as const),
    executedAt: s.dateTimeString()
  },
  { strict: true }
);

const PluginOperationResponseSchema = s.object(
  {
    data: PluginOperationResultSchema,
    meta: KernelSystemMetaSchema.optional()
  },
  { strict: true }
);

const PluginEventSchema = s.object(
  {
    sequence: s.number({ int: true, min: 1 }),
    timestamp: s.dateTimeString(),
    pluginId: s.string({ trim: true, minLength: 1 }),
    action: s.enum([
      "register",
      "unregister",
      "load",
      "unload",
      "reload",
      "disable",
      "enable",
      "load-many"
    ] as const),
    success: s.boolean(),
    phase: s
      .enum(["register", "dependency-check", "load", "init", "unload", "rollback"] as const)
      .optional(),
    message: s.string({ trim: true, minLength: 1 }).optional(),
    durationMs: s.number({ int: true, min: 0 }).optional(),
    stateBefore: s
      .enum([
        "registered",
        "loading",
        "initializing",
        "loaded",
        "unloading",
        "failed",
        "disabled",
        "unloaded"
      ] as const)
      .optional(),
    stateAfter: s
      .enum([
        "registered",
        "loading",
        "initializing",
        "loaded",
        "unloading",
        "failed",
        "disabled",
        "unloaded"
      ] as const)
      .optional()
  },
  { strict: false }
);

const PluginEventsResponseSchema = s.object(
  {
    data: s.array(PluginEventSchema),
    meta: KernelSystemMetaSchema.optional()
  },
  { strict: true }
);

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
              schema: toOpenApiSchema(
                s.object(
                  {
                    data: KernelInstalledPluginSchema,
                    meta: KernelSystemMetaSchema.optional()
                  },
                  { strict: true }
                )
              )
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

    return responder.list(this.system.listPluginEvents(pluginId));
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
