export interface AsyncActionState<T = void> {
  ok: boolean;
  error: string | null;
  data: T | null;
}

/**
 * Client actions in React 19 always return a serializable envelope so forms,
 * dialogs, and page-level flows can share a single success/error contract.
 */
export function createIdleAsyncActionState<T = void>(): AsyncActionState<T> {
  return {
    ok: false,
    error: null,
    data: null
  };
}

export function readRequiredString(formData: FormData, name: string): string {
  const value = formData.get(name);
  if (typeof value !== "string") {
    throw new Error(`Missing form field: ${name}`);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`Field cannot be empty: ${name}`);
  }

  return normalized;
}

export function readOptionalString(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

export function readStringArray(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}
