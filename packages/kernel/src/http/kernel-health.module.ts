import { defineModule, factoryProvider } from "@trinacria/core";
import { httpProvider } from "@trinacria/http";
import { CORE_TOKENS } from "../tokens/core-tokens.js";
import { KernelHealthService } from "../runtime/kernel-health-service.js";
import { KERNEL_HEALTH_HTTP_CONTROLLER } from "./kernel-health.tokens.js";
import { KernelHealthHttpController } from "./kernel-health.controller.js";

/**
 * Trinacria module exposing `/health` and `/health/dependencies`.
 */
export const KernelHealthHttpModule = defineModule({
  name: "KernelHealthHttpModule",
  providers: [
    factoryProvider(
      CORE_TOKENS.KERNEL_HEALTH_SERVICE,
      (runtime) =>
        new KernelHealthService({
          runtime,
        }),
      [CORE_TOKENS.PLUGIN_RUNTIME],
    ),
    httpProvider(
      KERNEL_HEALTH_HTTP_CONTROLLER,
      KernelHealthHttpController,
      [CORE_TOKENS.KERNEL_HEALTH_SERVICE],
    ),
  ],
  exports: [CORE_TOKENS.KERNEL_HEALTH_SERVICE, KERNEL_HEALTH_HTTP_CONTROLLER],
});
