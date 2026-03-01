import { createToken } from "@trinacria/core";
import { HealthController } from "./health.controller";

export const HEALTH_CONTROLLER = createToken<HealthController>("HEALTH_CONTROLLER");
