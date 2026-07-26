import { type HttpResponse, response } from "@trinacria/http";
import type { ApiErrorResponse } from "../../contracts/api-contract.js";
import { apiError } from "../../contracts/api-contract.js";
import {
  PluginDependencyError,
  PluginLifecycleError,
  PluginRuntimeError,
  PluginStateTransitionError
} from "../../errors/plugin-errors.js";
import type {
  KernelInstalledPluginSnapshot,
  KernelPluginEventSnapshot
} from "../../runtime/system/kernel-system-service.js";
import { toApiErrorResponse } from "../api-http-utils.js";

export function fromPluginOperationError(
  pluginId: string,
  error: unknown,
  getInstalledPlugin: (id: string) => KernelInstalledPluginSnapshot | null,
  listPluginEvents: (id: string, limit: number) => readonly KernelPluginEventSnapshot[]
): HttpResponse<ApiErrorResponse> {
  const snapshot = getInstalledPlugin(pluginId);
  const recentEvents = listPluginEvents(pluginId, 5);
  const details = {
    ...(hasErrorDetails(error) ? error.details : {}),
    ...(snapshot ? { plugin: snapshot } : {}),
    ...(recentEvents.length > 0 ? { recentEvents } : {})
  };

  if (error instanceof PluginStateTransitionError || error instanceof PluginDependencyError) {
    return response(
      apiError("plugin_operation_not_allowed", error.message, details, {
        pluginId: "kernel"
      }),
      { status: 409 }
    );
  }

  if (error instanceof PluginRuntimeError || error instanceof PluginLifecycleError) {
    return response(
      apiError("plugin_operation_failed", error.message, details, {
        pluginId: "kernel"
      }),
      { status: 409 }
    );
  }

  return response(toApiErrorResponse(error), {
    status: getStatusCodeForApiError(error)
  });
}

function hasErrorDetails(error: unknown): error is { details?: Record<string, unknown> } {
  return Boolean(error && typeof error === "object" && "details" in error);
}

function getStatusCodeForApiError(_error: unknown): number {
  return 400;
}
