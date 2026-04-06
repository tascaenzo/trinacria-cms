import { useEffect, useMemo, useState, type PropsWithChildren, type ReactNode } from "react";
import { Icon } from "../components/icon.js";
import { cn } from "../utils/class-names.js";

const SIDEBAR_STORAGE_KEY = "trinacria-cms:admin-sidebar-collapsed";

/**
 * The UI package only needs the shape required by the shell renderer. The full
 * backend-aware admin contracts live in the admin-kernel package.
 */
export interface AdminShellNavigationItem {
  id: string;
  routeId: string;
  title: string;
  icon?: string;
  group?: string;
  badge?: string;
  order?: number;
}

export interface AdminShellStatusBadge {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}

export interface AdminShellProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  activeRouteId: string;
  navigation: readonly AdminShellNavigationItem[];
  onNavigate: (routeId: string) => void;
  statusBadges?: readonly AdminShellStatusBadge[];
  headerActions?: ReactNode;
  sidebarFooter?: ReactNode;
}

function badgeToneClass(tone: AdminShellStatusBadge["tone"]): string {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-[color:var(--color-border)] bg-[color:var(--color-panel)] text-[color:var(--color-ink-muted)]";
}

function readSidebarState(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * AdminShell owns the dashboard frame: responsive sidebar, compact header, and
 * a plugin-aware navigation surface that stays stable while pages change.
 */
export function AdminShell({
  activeRouteId,
  children,
  headerActions,
  navigation,
  onNavigate,
  sidebarFooter,
  statusBadges = [],
  subtitle,
  title,
}: AdminShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => readSidebarState());
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isSidebarCollapsed));
    } catch {
      // Ignore storage failures: the shell can still operate without persistence.
    }
  }, [isSidebarCollapsed]);

  const groups = useMemo(() => {
    const map = new Map<string, AdminShellNavigationItem[]>();

    for (const item of navigation) {
      const key = item.group ?? "Workspace";
      const list = map.get(key);
      if (list) {
        list.push(item);
      } else {
        map.set(key, [item]);
      }
    }

    return Array.from(map.entries()).map(([group, items]) => [
      group,
      [...items].sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
    ]) as Array<[string, AdminShellNavigationItem[]]>;
  }, [navigation]);

  const activeNavigation = navigation.find((item) => item.routeId === activeRouteId) ?? null;

  function handleNavigate(routeId: string) {
    onNavigate(routeId);
    setIsMobileSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-canvas)] text-[color:var(--color-ink)]">
      <div className="flex min-h-screen">
        <div
          className={cn(
            "fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition lg:hidden",
            isMobileSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={!isMobileSidebarOpen}
          onClick={() => setIsMobileSidebarOpen(false)}
        />

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[color:var(--color-border)] bg-[color:var(--color-panel)] transition-all duration-200",
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            isSidebarCollapsed ? "lg:w-[84px]" : "lg:w-[280px]",
          )}
        >
          <div
            className={cn(
              "flex h-16 items-center gap-3 border-b border-[color:var(--color-border)] px-4",
              isSidebarCollapsed && "justify-center px-0",
            )}
          >
            {!isSidebarCollapsed ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                <span className="text-sm font-semibold">T</span>
              </div>
            ) : null}
            <div className={cn("min-w-0 flex-1", isSidebarCollapsed && "lg:hidden")}>
              <p className="truncate text-sm font-semibold text-[color:var(--color-ink)]">Trinacria CMS</p>
              <p className="truncate text-xs text-[color:var(--color-ink-subtle)]">Admin dashboard</p>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((current) => !current)}
              className="hidden h-9 w-9 items-center justify-center rounded-md border border-[color:var(--color-border)] text-[color:var(--color-ink-muted)] transition hover:bg-slate-50 hover:text-[color:var(--color-ink)] lg:inline-flex"
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Icon name={isSidebarCollapsed ? "panel-left" : "panel-left-close"} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <nav className="space-y-6">
              {groups.map(([group, items]) => (
                <section key={group} className="space-y-1.5">
                  <div
                    className={cn(
                      "px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]",
                      isSidebarCollapsed && "lg:hidden",
                    )}
                  >
                    {group}
                  </div>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const isActive = item.routeId === activeRouteId;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          title={item.title}
                          onClick={() => handleNavigate(item.routeId)}
                          className={cn(
                            "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition",
                            isSidebarCollapsed ? "lg:justify-center lg:px-0" : "justify-between",
                            isActive
                              ? "bg-slate-900 text-white shadow-sm"
                              : "text-[color:var(--color-ink-muted)] hover:bg-slate-100 hover:text-[color:var(--color-ink)]",
                          )}
                        >
                          <span className="flex items-center gap-3 overflow-hidden">
                            {item.icon ? (
                              <Icon
                                name={item.icon}
                                className={cn(isActive ? "text-white" : "text-[color:var(--color-ink-subtle)]")}
                              />
                            ) : null}
                            <span className={cn("truncate font-medium", isSidebarCollapsed && "lg:hidden")}>{item.title}</span>
                          </span>
                          {item.badge ? (
                            <span
                              className={cn(
                                "rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
                                isActive
                                  ? "border-white/15 bg-white/10 text-white/80"
                                  : "border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] text-[color:var(--color-ink-subtle)]",
                                isSidebarCollapsed && "lg:hidden",
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
              ))}
            </nav>
          </div>

          {sidebarFooter ? (
            <div className="border-t border-[color:var(--color-border)] p-3">{sidebarFooter}</div>
          ) : null}
        </aside>

        <div
          className={cn(
            "min-w-0 flex-1",
            isSidebarCollapsed ? "lg:ml-[84px]" : "lg:ml-[280px]",
          )}
        >
          <header className="sticky top-0 z-20 border-b border-[color:var(--color-border)] bg-[rgba(250,250,250,0.92)] backdrop-blur-xl">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--color-border)] text-[color:var(--color-ink-muted)] transition hover:bg-white hover:text-[color:var(--color-ink)] lg:hidden"
                aria-label="Open sidebar"
              >
                <Icon name="panel-left" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-[color:var(--color-ink-subtle)]">
                  <span>Dashboard</span>
                  <Icon name="chevron-right" className="h-3.5 w-3.5" />
                  <span className="truncate text-[color:var(--color-ink-muted)]">{activeNavigation?.title ?? title}</span>
                </div>
                <h1 className="mt-0.5 truncate text-lg font-semibold tracking-[-0.02em] text-[color:var(--color-ink)]">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="truncate text-sm text-[color:var(--color-ink-subtle)]">{subtitle}</p>
                ) : null}
              </div>
              {statusBadges.length > 0 ? (
                <div className="hidden items-center gap-2 xl:flex">
                  {statusBadges.map((badge) => (
                    <div
                      key={`${badge.label}:${badge.value}`}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium",
                        badgeToneClass(badge.tone),
                      )}
                    >
                      <span className="text-[color:var(--color-ink-subtle)]">{badge.label}</span>
                      <span className="ml-1 text-[color:var(--color-ink)]">{badge.value}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="flex items-center gap-2">{headerActions}</div>
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
