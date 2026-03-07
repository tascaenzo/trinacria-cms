export interface StoredBackofficeSession {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  refreshExpiresAt?: string;
}

const STORAGE_KEY = "trinacria-cms.backoffice.session";

/**
 * Session storage is used only as a bearer-token fallback. The primary auth
 * model for the backoffice remains cookie-based through the local dev proxy.
 */
export function readStoredBackofficeSession(): StoredBackofficeSession {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as StoredBackofficeSession;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function persistBackofficeSession(session: StoredBackofficeSession): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearBackofficeSession(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function getStoredAccessToken(): string | undefined {
  return readStoredBackofficeSession().accessToken;
}
