import { CmsSdkHttpError } from "@trinacria-cms/sdk";

interface ApiErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
  };
}

/**
 * Admin pages should show concise, domain-aware error messages instead of raw
 * transport details whenever the backend exposes the standard error envelope.
 */
export function toDisplayError(error: unknown): string {
  if (error instanceof CmsSdkHttpError) {
    const data = error.data as ApiErrorEnvelope | undefined;
    if (data?.error?.message) {
      return data.error.message;
    }
    return `HTTP ${error.status}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected backoffice error";
}
