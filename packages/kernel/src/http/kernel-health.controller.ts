import type { HttpContext } from "@trinacria/http";
import { HttpController } from "@trinacria/http";
import type { KernelHealthService } from "../runtime/kernel-health-service.js";

/**
 * HTTP controller exposing kernel health endpoints.
 */
export class KernelHealthHttpController extends HttpController {
  constructor(private readonly healthService: KernelHealthService) {
    super();
  }

  routes() {
    return this.router()
      .get("/health", this.getHealth)
      .get("/health/dependencies", this.getDependencies)
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
