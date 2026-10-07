import { HttpController, response } from "@trinacria/http";

export class KernelCorsPreflightController extends HttpController {
  routes() {
    return this.router()
      .options("/health", this.preflight, {
        docs: {
          excludeFromOpenApi: true,
          exclusionReason: "CORS protocol preflight; no business operation",
          pluginId: "kernel"
        }
      })
      .options("/health/dependencies", this.preflight, {
        docs: {
          excludeFromOpenApi: true,
          exclusionReason: "CORS protocol preflight; no business operation",
          pluginId: "kernel"
        }
      })
      .options("/v1/:a", this.preflight, {
        docs: {
          excludeFromOpenApi: true,
          exclusionReason: "CORS protocol preflight; no business operation",
          pluginId: "kernel"
        }
      })
      .options("/v1/:a/:b", this.preflight, {
        docs: {
          excludeFromOpenApi: true,
          exclusionReason: "CORS protocol preflight; no business operation",
          pluginId: "kernel"
        }
      })
      .options("/v1/:a/:b/:c", this.preflight, {
        docs: {
          excludeFromOpenApi: true,
          exclusionReason: "CORS protocol preflight; no business operation",
          pluginId: "kernel"
        }
      })
      .options("/v1/:a/:b/:c/:d", this.preflight, {
        docs: {
          excludeFromOpenApi: true,
          exclusionReason: "CORS protocol preflight; no business operation",
          pluginId: "kernel"
        }
      })
      .options("/v1/:a/:b/:c/:d/:e", this.preflight, {
        docs: {
          excludeFromOpenApi: true,
          exclusionReason: "CORS protocol preflight; no business operation",
          pluginId: "kernel"
        }
      })
      .options("/v1/:a/:b/:c/:d/:e/:f", this.preflight, {
        docs: {
          excludeFromOpenApi: true,
          exclusionReason: "CORS protocol preflight; no business operation",
          pluginId: "kernel"
        }
      })
      .build();
  }

  private preflight = () => response(null, { status: 204 });
}
