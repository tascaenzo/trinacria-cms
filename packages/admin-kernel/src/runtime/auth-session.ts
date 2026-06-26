export interface StoredBackofficeSession {
  expiresAt?: string;
}

const STORAGE_KEY = "trinacria-cms.backoffice.session";

export function readStoredBackofficeSession(): StoredBackofficeSession {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as StoredBackofficeSession & { accessToken?: unknown };
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return {
      expiresAt: typeof parsed.expiresAt === "string" ? parsed.expiresAt : undefined
    };
  } catch {
    return {};
  }
}

export function persistBackofficeSession(session: StoredBackofficeSession): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      expiresAt: session.expiresAt
    })
  );
}

export function clearBackofficeSession(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function getStoredAccessToken(): string | undefined {
  return undefined;
}
