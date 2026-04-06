import { CmsSdkHttpError } from "@trinacria-cms/sdk";

interface ApiErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

export interface SdkErrorDetails {
  status?: number;
  code: string | null;
  message: string | null;
  details?: Record<string, unknown>;
}

export function getSdkErrorDetails(error: unknown): SdkErrorDetails {
  if (error instanceof CmsSdkHttpError) {
    const data = error.data as ApiErrorEnvelope | undefined;
    return {
      status: error.status,
      code: data?.error?.code ?? null,
      message: data?.error?.message ?? `HTTP ${error.status}`,
      details: data?.error?.details
    };
  }

  if (error instanceof Error) {
    return {
      status: undefined,
      code: null,
      message: error.message
    };
  }

  return {
    status: undefined,
    code: null,
    message: "Unexpected backoffice error"
  };
}

/**
 * Admin pages should show concise, domain-aware error messages instead of raw
 * transport details whenever the backend exposes the standard error envelope.
 */
export function toDisplayError(error: unknown): string {
  return getSdkErrorDetails(error).message ?? "Unexpected backoffice error";
}
