import { HttpController, response } from "@trinacria/http";

export class KernelCorsPreflightController extends HttpController {
  routes() {
    return this.router()
      .options("/health", this.preflight)
      .options("/health/dependencies", this.preflight)
      .options("/v1/:a", this.preflight)
      .options("/v1/:a/:b", this.preflight)
      .options("/v1/:a/:b/:c", this.preflight)
      .options("/v1/:a/:b/:c/:d", this.preflight)
      .options("/v1/:a/:b/:c/:d/:e", this.preflight)
      .options("/v1/:a/:b/:c/:d/:e/:f", this.preflight)
      .build();
  }

  private preflight = () => response(null, { status: 204 });
}
