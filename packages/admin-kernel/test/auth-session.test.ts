import assert from "node:assert/strict";
import test, { beforeEach, after } from "node:test";

const storage = new Map<string, string>();
const originalWindow = globalThis.window;

beforeEach(() => {
  storage.clear();
  const mockedWindow = {
    sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
      length: storage.size,
      key: (_index: number) => null
    }
  } as unknown as Window & typeof globalThis;

  (globalThis as { window?: typeof mockedWindow }).window = mockedWindow;
});

after(() => {
  (globalThis as { window?: unknown }).window = originalWindow;
});

test("readStoredBackofficeSession returns empty object when no session stored", async () => {
  const { readStoredBackofficeSession } = await import("../src/runtime/auth-session.js");
  const session = readStoredBackofficeSession();
  assert.deepEqual(session, {});
});

test("persistBackofficeSession writes to sessionStorage", async () => {
  const { persistBackofficeSession, readStoredBackofficeSession } = await import(
    "../src/runtime/auth-session.js"
  );
  persistBackofficeSession({
    accessToken: "token-123",
    refreshToken: "refresh-456",
    expiresAt: "2026-06-01T00:00:00Z",
    refreshExpiresAt: "2026-07-01T00:00:00Z"
  });

  const session = readStoredBackofficeSession();
  assert.equal(session.accessToken, "token-123");
  assert.equal(session.refreshToken, "refresh-456");
});

test("clearBackofficeSession removes session from storage", async () => {
  const { persistBackofficeSession, clearBackofficeSession, readStoredBackofficeSession } =
    await import("../src/runtime/auth-session.js");
  persistBackofficeSession({ accessToken: "token-123" });
  clearBackofficeSession();
  const session = readStoredBackofficeSession();
  assert.deepEqual(session, {});
});

test("getStoredAccessToken returns the stored access token", async () => {
  const { persistBackofficeSession, getStoredAccessToken } = await import(
    "../src/runtime/auth-session.js"
  );
  persistBackofficeSession({ accessToken: "abc-xyz" });
  assert.equal(getStoredAccessToken(), "abc-xyz");
});

test("getStoredAccessToken returns undefined when not stored", async () => {
  const { getStoredAccessToken } = await import("../src/runtime/auth-session.js");
  assert.equal(getStoredAccessToken(), undefined);
});
