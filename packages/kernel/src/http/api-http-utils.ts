import { apiError, type ApiErrorResponse } from "../contracts/api-contract.js";
import { apiSuccess, type ApiResponseMeta } from "../contracts/api-contract.js";

/**
 * Parses a numeric query parameter from Trinacria HttpContext query object.
 */
export function parseQueryNumber(
  value: string | string[] | undefined,
): number | undefined {
  if (value === undefined) return undefined;
  const first = Array.isArray(value) ? value[0] : value;
  if (first === undefined || first === "") return undefined;
  const parsed = Number(first);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Maps unknown runtime errors to a canonical API error response.
 */
export function toApiErrorResponse(error: unknown): ApiErrorResponse {
  if (error instanceof Error) {
    if (error.message.includes("already exists")) {
      return apiError("conflict", error.message);
    }
    return apiError("validation_error", error.message);
  }
  return apiError("internal_error", "Unexpected error");
}

export interface PluginApiResponder {
  success<TData>(data: TData, meta?: ApiResponseMeta): { data: TData; meta?: ApiResponseMeta };
  list<TData>(
    data: readonly TData[],
    meta?: Omit<ApiResponseMeta, "count" | "pluginId">,
  ): { data: readonly TData[]; meta?: ApiResponseMeta };
  invalidRequest(message: string, details?: Record<string, unknown>): ApiErrorResponse;
  notFound(message: string, details?: Record<string, unknown>): ApiErrorResponse;
  fromError(error: unknown): ApiErrorResponse;
}

/**
 * Creates a response helper bound to a plugin id.
 * All response envelopes include `meta.pluginId`.
 */
export function createPluginApiResponder(pluginId: string): PluginApiResponder {
  const pluginMeta: ApiResponseMeta = { pluginId };

  return {
    success<TData>(data: TData, meta?: ApiResponseMeta) {
      return apiSuccess(data, {
        ...pluginMeta,
        ...(meta ?? {}),
      });
    },
    list<TData>(
      data: readonly TData[],
      meta?: Omit<ApiResponseMeta, "count" | "pluginId">,
    ) {
      return apiSuccess(data, {
        ...pluginMeta,
        count: data.length,
        ...(meta ?? {}),
      });
    },
    invalidRequest(message: string, details?: Record<string, unknown>) {
      return apiError("invalid_request", message, details, pluginMeta);
    },
    notFound(message: string, details?: Record<string, unknown>) {
      return apiError("not_found", message, details, pluginMeta);
    },
    fromError(error: unknown) {
      const mapped = toApiErrorResponse(error);
      return {
        ...mapped,
        meta: {
          ...pluginMeta,
          ...(mapped.meta ?? {}),
        },
      };
    },
  };
}

/**
 * Accepts either a ready OpenAPI schema object or a schema-like object exposing
 * `toOpenApi()`, returning a plain OpenAPI schema object.
 */
export function toOpenApiSchema(
  schema:
    | Record<string, unknown>
    | {
        toOpenApi(): Record<string, unknown>;
      },
): Record<string, unknown> {
  if (
    schema &&
    typeof schema === "object" &&
    "toOpenApi" in schema &&
    typeof (schema as { toOpenApi?: unknown }).toOpenApi === "function"
  ) {
    return (schema as { toOpenApi(): Record<string, unknown> }).toOpenApi();
  }
  return schema as Record<string, unknown>;
}
