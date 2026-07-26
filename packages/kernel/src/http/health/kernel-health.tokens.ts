import { createToken } from "@trinacria/core";
import type { KernelHealthHttpController } from "./kernel-health.controller.js";

export const KERNEL_HEALTH_HTTP_CONTROLLER = createToken<KernelHealthHttpController>(
  "KERNEL_HEALTH_HTTP_CONTROLLER"
);
