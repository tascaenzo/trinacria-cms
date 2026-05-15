/**
 * Standard API envelope for successful responses.
 */
export interface ApiSuccessResponse<TData> {
  data: TData;
  meta?: ApiResponseMeta;
  requestId?: string;
}

/**
 * Standard API envelope for failed responses.
 */
export interface ApiErrorResponse {
  error: ApiError;
  meta?: ApiResponseMeta;
  requestId?: string;
}

/**
 * Canonical API error model shared across controllers and SDK.
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Optional metadata attached to API responses.
 */
export interface ApiResponseMeta {
  pluginId?: string;
  count?: number;
  limit?: number;
  offset?: number;
  nextCursor?: string;
}

/**
 * Helper to build a successful API envelope.
 */
export function apiSuccess<TData>(data: TData, meta?: ApiResponseMeta): ApiSuccessResponse<TData> {
  return meta ? { data, meta } : { data };
}

/**
 * Helper to build a failed API envelope.
 */
export function apiError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  meta?: ApiResponseMeta
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      ...(details ? { details } : {})
    },
    ...(meta ? { meta } : {})
  };
}
