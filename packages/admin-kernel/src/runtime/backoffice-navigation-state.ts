export type BackofficeNavigationWriteMode = "push" | "replace";

export type BackofficeNavigationState = {
  routeId: string | null;
  params: URLSearchParams;
};

const BACKOFFICE_NAVIGATION_EVENT = "trinacria-cms:backoffice-navigation";
let configuredBasePath = "";

export function configureBackofficeNavigation(options: { basePath?: string } = {}) {
  configuredBasePath = normalizeBasePath(options.basePath ?? "");
}

export function getBackofficeNavigationEventName(): string {
  return BACKOFFICE_NAVIGATION_EVENT;
}

export function readBackofficeNavigationState(): BackofficeNavigationState {
  if (typeof window === "undefined") {
    return {
      routeId: null,
      params: new URLSearchParams()
    };
  }

  return parseBackofficePath(window.location.pathname, window.location.search);
}

export function migrateLegacyHashNavigation() {
  if (typeof window === "undefined") {
    return;
  }

  const legacyState = parseLegacyBackofficeHash(window.location.hash);
  if (!legacyState.routeId) {
    return;
  }

  writeBackofficeNavigationState(legacyState.routeId, legacyState.params, "replace");
}

export function writeBackofficeNavigationState(
  routeId: string,
  params: URLSearchParams = new URLSearchParams(),
  mode: BackofficeNavigationWriteMode = "push"
) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedRouteId = normalizeRouteId(routeId);
  const query = params.toString();
  const path = buildBackofficePath(normalizedRouteId);
  const url = `${path}${query ? `?${query}` : ""}`;
  if (window.location.pathname === path && window.location.search === (query ? `?${query}` : "")) {
    return;
  }

  if (mode === "replace") {
    window.history.replaceState(null, "", url);
  } else {
    window.history.pushState(null, "", url);
  }
  window.dispatchEvent(new Event(BACKOFFICE_NAVIGATION_EVENT));
}

export function setBackofficeRouteStateParam(
  key: string,
  value: string,
  mode: BackofficeNavigationWriteMode = "push"
) {
  const state = readBackofficeNavigationState();
  if (!state.routeId) {
    return;
  }

  state.params.set(key, value);
  writeBackofficeNavigationState(state.routeId, state.params, mode);
}

export function clearBackofficeRouteStateParams(
  keys: readonly string[],
  mode: BackofficeNavigationWriteMode = "push"
) {
  const state = readBackofficeNavigationState();
  if (!state.routeId) {
    return;
  }

  for (const key of keys) {
    state.params.delete(key);
  }
  writeBackofficeNavigationState(state.routeId, state.params, mode);
}

export function getBackofficeRouteStateParam(key: string): string | null {
  return readBackofficeNavigationState().params.get(key);
}

function parseBackofficePath(pathname: string, search: string): BackofficeNavigationState {
  const path = stripConfiguredBasePath(pathname).replace(/^\/+|\/+$/g, "");
  const [routeId = ""] = path.split("/", 1);
  return {
    routeId: decodeURIComponent(normalizeRouteId(routeId)) || null,
    params: new URLSearchParams(search)
  };
}

function normalizeRouteId(routeId: string): string {
  return routeId.replace(/^\/+/, "").trim();
}

function parseLegacyBackofficeHash(hash: string): BackofficeNavigationState {
  const rawHash = hash.replace(/^#\/?/, "").trim();
  if (!rawHash) {
    return {
      routeId: null,
      params: new URLSearchParams()
    };
  }

  const [routeId = "", query = ""] = rawHash.split("?", 2);
  return {
    routeId: normalizeRouteId(routeId) || null,
    params: new URLSearchParams(query)
  };
}

function buildBackofficePath(routeId: string): string {
  const encodedRouteId = encodeURIComponent(routeId);
  if (!configuredBasePath) {
    return `/${encodedRouteId}`;
  }
  return `${configuredBasePath}/${encodedRouteId}`;
}

function stripConfiguredBasePath(pathname: string): string {
  if (!configuredBasePath) {
    return pathname;
  }
  if (pathname === configuredBasePath) {
    return "/";
  }
  if (pathname.startsWith(`${configuredBasePath}/`)) {
    return pathname.slice(configuredBasePath.length);
  }
  return pathname;
}

function normalizeBasePath(basePath: string): string {
  const normalized = basePath.trim().replace(/^\/?/, "/").replace(/\/+$/, "");
  return normalized === "/" ? "" : normalized;
}
