import assert from "node:assert/strict";
import test, { after, beforeEach } from "node:test";

const originalWindow = globalThis.window;
let currentUrl: URL;

beforeEach(() => {
  currentUrl = new URL("http://localhost/");
  const mockedWindow = {
    location: {
      get pathname() {
        return currentUrl.pathname;
      },
      get search() {
        return currentUrl.search;
      },
      get hash() {
        return currentUrl.hash;
      },
      set hash(value: string) {
        currentUrl.hash = value.startsWith("#") ? value : `#${value}`;
      }
    },
    dispatchEvent: (_event: Event) => true,
    history: {
      pushState: (_data: unknown, _unused: string, url?: string | URL | null) => {
        if (url) {
          currentUrl = new URL(String(url), currentUrl);
        }
      },
      replaceState: (_data: unknown, _unused: string, url?: string | URL | null) => {
        if (url) {
          currentUrl = new URL(String(url), currentUrl);
        }
      }
    }
  } as unknown as Window & typeof globalThis;

  (globalThis as { window?: typeof mockedWindow }).window = mockedWindow;
});

after(() => {
  (globalThis as { window?: unknown }).window = originalWindow;
});

test("readBackofficeNavigationState parses route ids separately from query params", async () => {
  const { readBackofficeNavigationState } =
    await import("../src/runtime/backoffice-navigation-state.js");
  currentUrl = new URL("http://localhost/users?record=user-123");

  const state = readBackofficeNavigationState();

  assert.equal(state.routeId, "users");
  assert.equal(state.params.get("record"), "user-123");
});

test("route state params can be written and cleared without changing the route id", async () => {
  const {
    clearBackofficeRouteStateParams,
    readBackofficeNavigationState,
    setBackofficeRouteStateParam,
    writeBackofficeNavigationState
  } = await import("../src/runtime/backoffice-navigation-state.js");

  writeBackofficeNavigationState("users");
  setBackofficeRouteStateParam("record", "user 123");

  assert.equal(currentUrl.pathname, "/users");
  assert.equal(currentUrl.search, "?record=user+123");
  assert.equal(readBackofficeNavigationState().routeId, "users");

  clearBackofficeRouteStateParams(["record"]);

  assert.equal(currentUrl.pathname, "/users");
  assert.equal(currentUrl.search, "");
});

test("migrateLegacyHashNavigation rewrites old hash URLs to clean history URLs", async () => {
  const { migrateLegacyHashNavigation, readBackofficeNavigationState } =
    await import("../src/runtime/backoffice-navigation-state.js");
  currentUrl = new URL("http://localhost/#/users?record=user-123");

  migrateLegacyHashNavigation();

  assert.equal(currentUrl.pathname, "/users");
  assert.equal(currentUrl.search, "?record=user-123");
  assert.equal(currentUrl.hash, "");
  assert.equal(readBackofficeNavigationState().routeId, "users");
});
