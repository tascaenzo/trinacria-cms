import {
  createPluginApiResponder,
  toOpenApiSchema,
} from "./api-http-utils.js";
import { HttpController } from "@trinacria/http";
import { s } from "@trinacria/schema";
import type { KernelSystemService } from "../runtime/kernel-system-service.js";

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
      "unloaded",
    ] as const),
    capabilities: s.array(s.string({ trim: true, minLength: 1 })),
    dependencies: s.array(
      s.object(
        {
          pluginId: s.string({ trim: true, minLength: 1 }),
          versionRange: s.string({ trim: true, minLength: 1 }),
          optional: s.boolean(),
        },
        { strict: true },
      ),
    ),
    security: s.object(
      {
        permissions: s.number({ int: true, min: 0 }),
        roles: s.number({ int: true, min: 0 }),
        grants: s.number({ int: true, min: 0 }),
        policyRules: s.number({ int: true, min: 0 }),
      },
      { strict: true },
    ),
    loadedAt: s.dateTimeString().optional(),
  },
  { strict: true },
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
      "unloaded",
    ] as const),
  },
  { strict: true },
);

const KernelSystemMetaSchema = s.object(
  {
    pluginId: s.literal("kernel").optional(),
    count: s.number({ int: true }).optional(),
  },
  { strict: true },
);

const ListInstalledPluginsResponseSchema = s.object(
  {
    data: s.array(KernelInstalledPluginSchema),
    meta: KernelSystemMetaSchema.optional(),
  },
  { strict: true },
);

const ListCapabilitiesResponseSchema = s.object(
  {
    data: s.array(KernelCapabilitySchema),
    meta: KernelSystemMetaSchema.optional(),
  },
  { strict: true },
);

/**
 * Built-in kernel HTTP controller exposing runtime discovery for SDKs and
 * operational tooling.
 */
export class KernelSystemHttpController extends HttpController {
  constructor(private readonly system: KernelSystemService) {
    super();
  }

  routes() {
    return this.router()
      .get("/v1/system/plugins", this.listInstalledPlugins, {
        docs: {
          summary: "List installed plugins and their runtime state",
          tags: ["System"],
          operationId: "listInstalledPlugins",
          responses: {
            200: {
              description: "Installed plugin discovery snapshot",
              schema: toOpenApiSchema(ListInstalledPluginsResponseSchema),
            },
          },
        },
      })
      .get("/v1/system/capabilities", this.listCapabilities, {
        docs: {
          summary: "List published capabilities across installed plugins",
          tags: ["System"],
          operationId: "listInstalledCapabilities",
          responses: {
            200: {
              description: "Flattened capability catalog",
              schema: toOpenApiSchema(ListCapabilitiesResponseSchema),
            },
          },
        },
      })
      .build();
  }

  private listInstalledPlugins = async () => {
    return responder.list(this.system.listInstalledPlugins());
  };

  private listCapabilities = async () => {
    return responder.list(this.system.listCapabilities());
  };
}
