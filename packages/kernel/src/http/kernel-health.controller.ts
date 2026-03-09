import type { HttpContext } from "@trinacria/http";
import { HttpController } from "@trinacria/http";
import type { KernelHealthService } from "../runtime/kernel-health-service.js";

const KernelDependencySnapshotSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["nodes", "edges", "warnings"],
  properties: {
    nodes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["pluginId", "state", "version"],
        properties: {
          pluginId: { type: "string" },
          state: { type: "string" },
          version: { type: "string" },
        },
      },
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["from", "to", "status", "optional"],
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          status: { type: "string" },
          optional: { type: "boolean" },
          reason: { type: "string" },
        },
      },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
};

const KernelHealthSnapshotSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["timestamp", "status", "runtime", "dependencies", "db", "issues"],
  properties: {
    timestamp: { type: "string", format: "date-time" },
    status: { type: "string", enum: ["ok", "degraded", "down"] },
    runtime: {
      type: "object",
      additionalProperties: false,
      required: ["totalPlugins", "byState"],
      properties: {
        totalPlugins: { type: "integer" },
        byState: {
          type: "object",
          additionalProperties: false,
          required: [
            "registered",
            "loading",
            "initializing",
            "loaded",
            "unloading",
            "failed",
            "disabled",
            "unloaded",
          ],
          properties: {
            registered: { type: "integer" },
            loading: { type: "integer" },
            initializing: { type: "integer" },
            loaded: { type: "integer" },
            unloading: { type: "integer" },
            failed: { type: "integer" },
            disabled: { type: "integer" },
            unloaded: { type: "integer" },
          },
        },
      },
    },
    dependencies: KernelDependencySnapshotSchema,
    db: {
      type: "object",
      additionalProperties: false,
      required: ["ok"],
      properties: {
        ok: { type: "boolean" },
        reason: { type: "string" },
      },
    },
    issues: {
      type: "array",
      items: { type: "string" },
    },
  },
};

/**
 * HTTP controller exposing kernel health endpoints.
 */
export class KernelHealthHttpController extends HttpController {
  constructor(private readonly healthService: KernelHealthService) {
    super();
  }

  routes() {
    return this.router()
      .get("/health", this.getHealth, {
        docs: {
          summary: "Read aggregated kernel health",
          tags: ["Kernel Health"],
          operationId: "getKernelHealth",
          responses: {
            200: {
              description: "Kernel health snapshot",
              schema: KernelHealthSnapshotSchema,
            },
          },
        },
      })
      .get("/health/dependencies", this.getDependencies, {
        docs: {
          summary: "Read plugin dependency graph snapshot",
          tags: ["Kernel Health"],
          operationId: "getKernelDependencyGraph",
          responses: {
            200: {
              description: "Plugin dependency graph",
              schema: KernelDependencySnapshotSchema,
            },
          },
        },
      })
      .build();
  }

  private getHealth = async () => {
    return this.healthService.snapshot();
  };

  private getDependencies = async (_ctx: HttpContext) => {
    const snapshot = await this.healthService.snapshot();
    return snapshot.dependencies;
  };
}
