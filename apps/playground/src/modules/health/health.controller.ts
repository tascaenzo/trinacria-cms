import { HttpController } from "@trinacria/http";

export class HealthController extends HttpController {
  routes() {
    return this.router().get("/health", this.health).build();
  }

  async health() {
    return {
      ok: true,
      service: "trinacria-cms-playground",
      timestamp: new Date().toISOString()
    };
  }
}
