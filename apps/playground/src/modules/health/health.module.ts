import { defineModule } from "@trinacria/core";
import { httpProvider } from "@trinacria/http";
import { HealthController } from "./health.controller";
import { HEALTH_CONTROLLER } from "./health.tokens";

export const HealthModule = defineModule({
  name: "HealthModule",
  providers: [httpProvider(HEALTH_CONTROLLER, HealthController)],
  exports: [HEALTH_CONTROLLER]
});
