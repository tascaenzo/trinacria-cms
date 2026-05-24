import { createToken } from "@trinacria/core";
import { KernelSystemHttpController } from "./kernel-system.controller.js";

export const KERNEL_SYSTEM_HTTP_CONTROLLER = createToken<KernelSystemHttpController>(
  "KERNEL_SYSTEM_HTTP_CONTROLLER"
);
