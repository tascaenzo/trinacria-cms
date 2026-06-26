const SIDEBAR_STORAGE_KEY = "trinacria-cms:admin-sidebar-collapsed";
const SIDEBAR_GROUPS_STORAGE_KEY = "trinacria-cms:admin-sidebar-collapsed-groups";

export function readSidebarState(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeSidebarState(isCollapsed: boolean) {
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed));
  } catch {
    // Ignore storage failures: the shell can still operate without persistence.
  }
}

export function readCollapsedGroups(): Record<string, boolean> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const value = window.localStorage.getItem(SIDEBAR_GROUPS_STORAGE_KEY);
    if (!value) {
      return {};
    }
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, boolean] => {
        const [key, collapsed] = entry;
        return typeof key === "string" && typeof collapsed === "boolean";
      })
    );
  } catch {
    return {};
  }
}

export function writeCollapsedGroups(collapsedGroups: Record<string, boolean>) {
  try {
    window.localStorage.setItem(SIDEBAR_GROUPS_STORAGE_KEY, JSON.stringify(collapsedGroups));
  } catch {
    // Ignore storage failures: group collapse is a progressive enhancement.
  }
}
