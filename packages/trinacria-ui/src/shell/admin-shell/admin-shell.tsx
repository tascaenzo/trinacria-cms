import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../components/atoms/icon/icon.js";
import { cn } from "../../utils/class-names.js";
import type {
  AdminShellNavigationItem,
  AdminShellProps,
  AdminShellStatusBadge
} from "./admin-shell.types.js";
import {
  readCollapsedGroups,
  readSidebarState,
  writeCollapsedGroups,
  writeSidebarState
} from "./admin-shell.storage.js";

const EMPTY_HIDDEN_NAVIGATION_IDS: readonly string[] = [];

/**
 * The UI package only needs the shape required by the shell renderer. The full
 * backend-aware admin contracts live in the admin-kernel package.
 */
function badgeToneClass(tone: AdminShellStatusBadge["tone"]): string {
  if (tone === "success") {
    return "border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]";
  }
  if (tone === "warning") {
    return "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-ink)]";
  }
  return "border-[color:var(--color-border)] bg-[color:var(--color-panel)] text-[color:var(--color-ink-muted)]";
}

function toNavigationGroupId(group: string): string {
  return group
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * AdminShell owns the dashboard frame: responsive sidebar, compact header, and
 * a plugin-aware navigation surface that stays stable while pages change.
 */
export function AdminShell({
  activeRouteId,
  activeNavigationParams = "",
  children,
  headerActions,
  hideHeader = false,
  hiddenNavigationIds = EMPTY_HIDDEN_NAVIGATION_IDS,
  navigation,
  onNavigate,
  sidebarFooter,
  statusBadges = [],
  subtitle,
  title
}: AdminShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => readSidebarState());
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() =>
    readCollapsedGroups()
  );

  useEffect(() => {
    writeSidebarState(isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  useEffect(() => {
    writeCollapsedGroups(collapsedGroups);
  }, [collapsedGroups]);

  const hiddenNavigationIdSet = useMemo(() => new Set(hiddenNavigationIds), [hiddenNavigationIds]);

  const groups = useMemo(() => {
    const map = new Map<string, AdminShellNavigationItem[]>();

    for (const item of navigation) {
      if (hiddenNavigationIdSet.has(item.id)) {
        continue;
      }
      const key = item.group ?? "";
      const list = map.get(key);
      if (list) {
        list.push(item);
      } else {
        map.set(key, [item]);
      }
    }

    return Array.from(map.entries()).map(([group, items]) => [
      group,
      [...items].sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    ]) as Array<[string, AdminShellNavigationItem[]]>;
  }, [hiddenNavigationIdSet, navigation]);

  function handleNavigate(item: AdminShellNavigationItem) {
    onNavigate(item.routeId, item.params ? new URLSearchParams(item.params) : undefined);
    setIsMobileSidebarOpen(false);
  }

  function isNavigationItemActive(item: AdminShellNavigationItem) {
    const itemParams = new URLSearchParams(item.params);
    const currentParams = new URLSearchParams(activeNavigationParams);

    if (item.routeId === activeRouteId && itemParams.size === 0) {
      return currentParams.size === 0;
    }
    if (itemParams.size === 0) return false;
    return Array.from(itemParams).every(([key, value]) => currentParams.get(key) === value);
  }

  const activeNavigation =
    navigation.find((item) => isNavigationItemActive(item)) ??
    navigation.find((item) => item.routeId === activeRouteId) ??
    null;

  function toggleGroup(group: string) {
    setCollapsedGroups((current) => ({
      ...current,
      [group]: !current[group]
    }));
  }

  return (
    <div className="min-h-screen bg-(--color-panel-soft) text-(--color-ink)">
      <div className="flex min-h-screen">
        <div
          className={cn(
            "fixed inset-0 z-40 bg-(--color-overlay) backdrop-blur-sm transition lg:hidden",
            isMobileSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          aria-hidden={!isMobileSidebarOpen}
          onClick={() => setIsMobileSidebarOpen(false)}
        />

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-(--color-border) bg-(--color-panel) transition-all duration-200",
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            isSidebarCollapsed ? "lg:w-14" : "lg:w-64"
          )}
        >
          <div
            className={cn(
              "flex h-16 shrink-0 items-center gap-3 border-b border-(--color-border) px-4",
              isSidebarCollapsed && "lg:justify-center lg:px-3"
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-(--color-action-primary-bg) text-(--color-action-primary-ink) shadow-sm">
              <span className="text-sm font-semibold">T</span>
            </div>
            <div className={cn("min-w-0 flex-1", isSidebarCollapsed && "lg:hidden")}>
              <p className="truncate text-sm font-semibold text-(--color-ink)">Trinacria CMS</p>
              <p className="truncate text-xs text-(--color-ink-subtle)">Admin dashboard</p>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-(--color-ink-muted) transition hover:bg-(--color-interactive-hover) hover:text-(--color-ink) lg:hidden"
              aria-label="Close sidebar"
            >
              <Icon name="x" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
            <nav className="space-y-5">
              {groups.map(([group, items], groupIndex) => {
                const groupId = group
                  ? `admin-shell-nav-group-${groupIndex}-${toNavigationGroupId(group)}`
                  : undefined;
                const isGroupCollapsed =
                  Boolean(group && collapsedGroups[group]) && !isSidebarCollapsed;

                return (
                  <section key={group} className="space-y-1">
                    {group ? (
                      <button
                        type="button"
                        aria-expanded={!isGroupCollapsed}
                        aria-controls={groupId}
                        onClick={() => toggleGroup(group)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-md px-2 pb-1 pt-1 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-ink-subtle) transition hover:bg-(--color-interactive-hover) hover:text-(--color-ink-muted)",
                          isSidebarCollapsed && "lg:hidden"
                        )}
                      >
                        <span className="truncate">{group}</span>
                        <Icon
                          name={isGroupCollapsed ? "chevron-right" : "chevron-down"}
                          className="h-3.5 w-3.5"
                        />
                      </button>
                    ) : null}
                    <div id={groupId} className={cn("space-y-1", isGroupCollapsed && "hidden")}>
                      {items.map((item) => {
                        const isActive = isNavigationItemActive(item);

                        return (
                          <button
                            key={item.id}
                            type="button"
                            title={item.title}
                            onClick={() => handleNavigate(item)}
                            className={cn(
                              "group flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm transition",
                              isSidebarCollapsed ? "lg:justify-center lg:px-0" : "justify-between",
                              isActive
                                ? "bg-(--color-interactive-selected) text-(--color-interactive-selected-ink)"
                                : "text-(--color-ink-muted) hover:bg-(--color-interactive-hover) hover:text-(--color-ink)"
                            )}
                          >
                            <span className="flex items-center gap-3 overflow-hidden">
                              {item.icon ? (
                                <Icon
                                  name={item.icon}
                                  className={cn(
                                    "h-4 w-4 shrink-0",
                                    isActive
                                      ? "text-(--color-interactive-selected-ink)"
                                      : "text-(--color-ink-subtle) group-hover:text-(--color-ink-muted)"
                                  )}
                                />
                              ) : null}
                              <span
                                className={cn(
                                  "truncate font-medium",
                                  isSidebarCollapsed && "lg:hidden"
                                )}
                              >
                                {item.title}
                              </span>
                            </span>
                            {item.badge ? (
                              <span
                                className={cn(
                                  "rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
                                  isActive
                                    ? "border-(--color-overlay-soft) bg-(--color-overlay-soft) text-(--color-interactive-selected-ink)"
                                    : "border-(--color-border) bg-(--color-panel-soft) text-(--color-ink-subtle)",
                                  isSidebarCollapsed && "lg:hidden"
                                )}
                              >
                                {item.badge}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </nav>
          </div>

          {sidebarFooter ? (
            <div
              className={cn(
                "border-t border-(--color-border) p-2.5",
                isSidebarCollapsed && "lg:hidden"
              )}
            >
              {sidebarFooter}
            </div>
          ) : null}
        </aside>

        <div className={cn("min-w-0 flex-1", isSidebarCollapsed ? "lg:ml-14" : "lg:ml-64")}>
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-(--color-border) bg-(--color-panel-soft)/95 backdrop-blur-xl">
            <div className="flex w-full items-center gap-2 px-4">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-(--color-ink-muted) transition hover:bg-(--color-interactive-hover) hover:text-(--color-ink) lg:hidden"
                aria-label="Open sidebar"
              >
                <Icon name="panel-left" />
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed((current) => !current)}
                className="hidden h-8 w-8 items-center justify-center rounded-md text-(--color-ink-muted) transition hover:bg-(--color-interactive-hover) hover:text-(--color-ink) lg:inline-flex"
                aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <Icon name="panel-left" />
              </button>
              <div className="hidden h-4 w-px bg-(--color-border-strong) lg:block" />
              <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                <span className="hidden truncate text-(--color-ink-muted) md:inline">
                  Trinacria CMS
                </span>
                <Icon
                  name="chevron-right"
                  className="hidden h-3.5 w-3.5 text-(--color-ink-subtle) md:inline"
                />
                {activeNavigation?.group ? (
                  <>
                    <span className="hidden truncate text-(--color-ink-muted) md:inline">
                      {activeNavigation.group}
                    </span>
                    <span className="hidden text-(--color-ink-subtle) md:inline">/</span>
                  </>
                ) : null}
                <span className="truncate font-medium text-(--color-ink)">
                  {activeNavigation?.title ?? title}
                </span>
              </div>
              {statusBadges.length > 0 ? (
                <div className="hidden max-w-[46vw] gap-2 overflow-x-auto xl:flex">
                  {statusBadges.slice(0, 3).map((badge) => (
                    <div
                      key={`${badge.label}:${badge.value}`}
                      className={cn(
                        "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
                        badgeToneClass(badge.tone)
                      )}
                    >
                      <span className="text-(--color-ink-subtle)">{badge.label}</span>
                      <span className="ml-1 text-(--color-ink)">{badge.value}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="hidden items-center gap-2 md:flex">{headerActions}</div>
            </div>
          </header>

          <main className="px-4 py-4">
            <div className="grid gap-4">
              {!hideHeader ? (
                <div className="rounded-xl border border-(--color-border) bg-(--color-panel) px-4 py-4 shadow-(--shadow-sm) sm:px-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      {activeNavigation?.group ? (
                        <div className="flex items-center gap-2 text-xs text-(--color-ink-subtle) md:hidden">
                          <span>Trinacria CMS</span>
                          <Icon name="chevron-right" className="h-3.5 w-3.5" />
                          <span className="truncate">{activeNavigation.group}</span>
                        </div>
                      ) : null}
                      <h1 className="mt-1 truncate text-2xl font-semibold tracking-[-0.03em] text-(--color-ink) md:mt-0">
                        {title}
                      </h1>
                      {subtitle ? (
                        <p className="mt-1 max-w-3xl truncate text-sm text-(--color-ink-subtle)">
                          {subtitle}
                        </p>
                      ) : null}
                    </div>
                    {statusBadges.length > 0 ? (
                      <div className="flex gap-2 overflow-x-auto md:max-w-[50%] xl:hidden">
                        {statusBadges.slice(0, 3).map((badge) => (
                          <div
                            key={`${badge.label}:${badge.value}`}
                            className={cn(
                              "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
                              badgeToneClass(badge.tone)
                            )}
                          >
                            <span className="text-(--color-ink-subtle)">{badge.label}</span>
                            <span className="ml-1 text-(--color-ink)">{badge.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
