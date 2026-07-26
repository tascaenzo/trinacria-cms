import { defineModule, factoryProvider } from "@trinacria/core";
import { httpProvider } from "@trinacria/http";
import { KernelHealthService } from "../../runtime/system/kernel-health-service.js";
import { CORE_TOKENS } from "../../tokens/core-tokens.js";
import { KernelHealthHttpController } from "./kernel-health.controller.js";
import { KERNEL_HEALTH_HTTP_CONTROLLER } from "./kernel-health.tokens.js";

export const KernelHealthHttpModule = defineModule({
  name: "KernelHealthHttpModule",
  providers: [
    factoryProvider(
      CORE_TOKENS.KERNEL_HEALTH_SERVICE,
      (runtime) =>
        new KernelHealthService({
          runtime
        }),
      [CORE_TOKENS.PLUGIN_RUNTIME]
    ),
    httpProvider(KERNEL_HEALTH_HTTP_CONTROLLER, KernelHealthHttpController, [
      CORE_TOKENS.KERNEL_HEALTH_SERVICE
    ])
  ],
  exports: [CORE_TOKENS.KERNEL_HEALTH_SERVICE, KERNEL_HEALTH_HTTP_CONTROLLER]
});
