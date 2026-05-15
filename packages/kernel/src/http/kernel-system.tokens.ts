import { createToken } from "@trinacria/core";
import { KernelSystemHttpController } from "./kernel-system.controller.js";

/**
 * Token for the built-in HTTP controller exposing runtime discovery endpoints.
 */
export const KERNEL_SYSTEM_HTTP_CONTROLLER = createToken<KernelSystemHttpController>(
  "KERNEL_SYSTEM_HTTP_CONTROLLER"
);
