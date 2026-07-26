import { createToken } from "@trinacria/core";
import type { KernelCorsPreflightController } from "./cors-preflight.controller.js";

export const KERNEL_CORS_PREFLIGHT_CONTROLLER = createToken<KernelCorsPreflightController>(
  "KERNEL_CORS_PREFLIGHT_CONTROLLER"
);
