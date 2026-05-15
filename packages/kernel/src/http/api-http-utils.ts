import { apiError, type ApiErrorResponse } from "../contracts/api-contract.js";
import { apiSuccess, type ApiResponseMeta } from "../contracts/api-contract.js";
import { response, type HttpContext, type HttpResponse } from "@trinacria/http";
import { ValidationError, formatValidationError } from "@trinacria/schema";

/**
 * Parses a numeric query parameter from Trinacria HttpContext query object.
 */
export function parseQueryNumber(value: string | string[] | undefined): number | undefined {
  if (value === undefined) return undefined;
  const first = Array.isArray(value) ? value[0] : value;
  if (first === undefined || first === "") return undefined;
  const parsed = Number(first);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Reads a path parameter by key with case-insensitive fallback.
 * Some router adapters normalize parameter keys, so this helper keeps
 * controllers stable when using camelCase route params.
 */
export function parsePathParam(
  params: Record<string, string | undefined> | undefined,
  key: string,
  aliases: readonly string[] = []
): string | undefined {
  if (!params) {
    return undefined;
  }

  for (const candidate of [key, ...aliases]) {
    const direct = params[candidate];
    if (typeof direct === "string" && direct.length > 0) {
      return direct;
    }

    const normalized = candidate.toLowerCase();
    for (const [paramKey, paramValue] of Object.entries(params)) {
      if (
        paramKey.toLowerCase() === normalized &&
        typeof paramValue === "string" &&
        paramValue.length > 0
      ) {
        return paramValue;
      }
    }
  }

  return undefined;
}

export interface CookieSerializeOptions {
  path?: string;
  domain?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  maxAgeSeconds?: number;
  expiresAt?: Date;
}

/**
 * Reads a request header value in a runtime-safe way.
 * Returns the first value when a multi-value header is provided.
 */
export function getRequestHeader(ctx: Pick<HttpContext, "req">, name: string): string | undefined {
  const request = toNodeRequest(ctx.req);
  const value = request.headers?.[name.toLowerCase()];
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Parses a Cookie header into a key/value map.
 */
export function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const entries = cookieHeader.split(";");
  const cookies: Record<string, string> = {};

  for (const entry of entries) {
    const separatorIndex = entry.indexOf("=");
    if (separatorIndex <= 0) continue;
    const rawName = entry.slice(0, separatorIndex).trim();
    const rawValue = entry.slice(separatorIndex + 1).trim();
    if (!rawName) continue;
    try {
      cookies[rawName] = decodeURIComponent(rawValue);
    } catch {
      cookies[rawName] = rawValue;
    }
  }

  return cookies;
}

/**
 * Reads one cookie value from request context.
 */
export function getCookieValue(ctx: Pick<HttpContext, "req">, name: string): string | undefined {
  const cookieHeader = getRequestHeader(ctx, "cookie");
  const cookies = parseCookieHeader(cookieHeader);
  return cookies[name];
}

/**
 * Serializes a Set-Cookie header value.
 */
export function serializeCookie(
  name: string,
  value: string,
  options: CookieSerializeOptions = {}
): string {
  const parts: string[] = [`${name}=${encodeURIComponent(value)}`];

  const path = options.path?.trim() || "/";
  parts.push(`Path=${path}`);

  if (options.domain?.trim()) {
    parts.push(`Domain=${options.domain.trim()}`);
  }
  if (options.httpOnly !== false) {
    parts.push("HttpOnly");
  }
  if (options.secure !== false) {
    parts.push("Secure");
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }
  if (options.maxAgeSeconds !== undefined) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`);
  }
  if (options.expiresAt) {
    parts.push(`Expires=${options.expiresAt.toUTCString()}`);
  }

  return parts.join("; ");
}

/**
 * Maps unknown runtime errors to a canonical API error response.
 */
export function toApiErrorResponse(error: unknown): ApiErrorResponse {
  if (isCodedError(error)) {
    return apiError(error.code, error.message ?? "Unexpected error", error.details);
  }
  if (error instanceof ValidationError) {
    return apiError(
      "validation_error",
      formatValidationError(error, {
        prefix: "Validation failed:"
      }),
      {
        issues: error.issues
      }
    );
  }
  if (error instanceof Error) {
    if (error.message.includes("already exists")) {
      return apiError("conflict", error.message);
    }
    return apiError("validation_error", error.message);
  }
  return apiError("internal_error", "Unexpected error");
}

function isCodedError(error: unknown): error is {
  code: string;
  message?: string;
  details?: Record<string, unknown>;
} {
  if (!error || typeof error !== "object") {
    return false;
  }
  const candidate = error as { code?: unknown };
  return typeof candidate.code === "string" && /^[a-z][a-z0-9_]*$/.test(candidate.code.trim());
}

export interface PluginApiResponder {
  success<TData>(data: TData, meta?: ApiResponseMeta): { data: TData; meta?: ApiResponseMeta };
  list<TData>(
    data: readonly TData[],
    meta?: Omit<ApiResponseMeta, "count" | "pluginId">
  ): { data: readonly TData[]; meta?: ApiResponseMeta };
  invalidRequest(
    message: string,
    details?: Record<string, unknown>
  ): HttpResponse<ApiErrorResponse>;
  notFound(message: string, details?: Record<string, unknown>): HttpResponse<ApiErrorResponse>;
  fromError(error: unknown): HttpResponse<ApiErrorResponse>;
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
        ...(meta ?? {})
      });
    },
    list<TData>(data: readonly TData[], meta?: Omit<ApiResponseMeta, "count" | "pluginId">) {
      return apiSuccess(data, {
        ...pluginMeta,
        count: data.length,
        ...(meta ?? {})
      });
    },
    invalidRequest(message: string, details?: Record<string, unknown>) {
      return response(apiError("invalid_request", message, details, pluginMeta), {
        status: 400
      });
    },
    notFound(message: string, details?: Record<string, unknown>) {
      return response(apiError("not_found", message, details, pluginMeta), {
        status: 404
      });
    },
    fromError(error: unknown) {
      const mapped = toApiErrorResponse(error);
      return response(
        {
          ...mapped,
          meta: {
            ...pluginMeta,
            ...(mapped.meta ?? {})
          }
        },
        {
          status: getStatusCodeForApiError(mapped.error.code)
        }
      );
    }
  };
}

export function getStatusCodeForApiError(code: string): number {
  if (code === "invalid_request" || code === "validation_error") {
    return 400;
  }
  if (code === "not_found") {
    return 404;
  }
  if (code === "conflict" || code.startsWith("installation_")) {
    return 409;
  }
  if (code === "auth_forbidden_admin_required") {
    return 403;
  }
  if (code.startsWith("auth_")) {
    return 401;
  }
  if (code === "internal_error") {
    return 500;
  }

  return 400;
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
      }
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

function toNodeRequest(value: unknown): {
  headers?: Record<string, string | string[] | undefined>;
} {
  if (!value || typeof value !== "object") {
    return {};
  }

  const maybeRequest = value as { headers?: unknown };
  const headersRaw =
    maybeRequest.headers && typeof maybeRequest.headers === "object"
      ? (maybeRequest.headers as Record<string, unknown>)
      : undefined;
  const headers: Record<string, string | string[] | undefined> = {};

  if (headersRaw) {
    for (const [key, headerValue] of Object.entries(headersRaw)) {
      if (typeof headerValue === "string") {
        headers[key.toLowerCase()] = headerValue;
      } else if (Array.isArray(headerValue)) {
        const normalized = headerValue.filter((item): item is string => typeof item === "string");
        headers[key.toLowerCase()] = normalized.length > 0 ? normalized : undefined;
      }
    }
  }

  return { headers };
}
