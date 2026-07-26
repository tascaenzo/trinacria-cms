import { CmsSdkHttpError } from "@trinacria-cms/sdk";

interface EditorialApiErrorEnvelope {
  error?: {
    message?: string;
  };
}

export function toEditorialDisplayError(error: unknown, fallback: string): string {
  if (error instanceof CmsSdkHttpError) {
    const response = error.data as EditorialApiErrorEnvelope | undefined;
    return response?.error?.message?.trim() || fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
