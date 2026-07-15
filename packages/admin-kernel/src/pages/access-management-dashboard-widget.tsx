import { useEffect, useMemo, useState } from "react";
import { Button, Icon } from "@trinacria-cms/trinacria-ui";
import type { PermissionsApi, RolesApi, UsersApi } from "@trinacria-cms/sdk";
import type { AdminDashboardWidgetRenderContext } from "../runtime/admin-route-runtime.js";

type UserRecord = Awaited<ReturnType<UsersApi["listUsers"]>>["data"][number];
type RoleRecord = Awaited<ReturnType<RolesApi["listRoles"]>>["data"][number];
type PermissionRecord = Awaited<ReturnType<PermissionsApi["listPermissions"]>>["data"][number];

interface AccessSnapshot {
  users: readonly UserRecord[];
  roles: readonly RoleRecord[];
  permissions: readonly PermissionRecord[];
}

const EMPTY_SNAPSHOT: AccessSnapshot = { users: [], roles: [], permissions: [] };
const PAGE_LIMIT = 200;

/** Core dashboard widget for the operational user-access overview. */
export function AccessManagementDashboardWidget({
  context
}: {
  context: Omit<AdminDashboardWidgetRenderContext, "widget">;
}) {
  const [snapshot, setSnapshot] = useState<AccessSnapshot>(EMPTY_SNAPSHOT);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshot() {
      try {
        setIsLoading(true);
        setError(null);
        const [users, roles, permissions] = await Promise.all([
          context.cms.users.listUsers({ query: { limit: PAGE_LIMIT, offset: 0 } }),
          context.cms.roles.listRoles({ query: { limit: PAGE_LIMIT, offset: 0 } }),
          context.cms.permissions.listPermissions({ query: { limit: PAGE_LIMIT, offset: 0 } })
        ]);
        if (!cancelled) {
          setSnapshot({
            users: users.data,
            roles: roles.data,
            permissions: permissions.data
          });
        }
      } catch (currentError) {
        if (!cancelled) {
          setError(toDisplayError(currentError));
          setSnapshot(EMPTY_SNAPSHOT);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSnapshot();
    return () => {
      cancelled = true;
    };
  }, [context.cms]);

  const activeUsers = snapshot.users.filter((user) => user.status === "active").length;
  const activeRoles = snapshot.roles.filter((role) => role.status === "active").length;
  const activePermissions = snapshot.permissions.filter(
    (permission) => permission.status === "active"
  ).length;
  const registrationTrend = useMemo(() => buildRegistrationTrend(snapshot.users), [snapshot.users]);
  const hasMoreUsers = snapshot.users.length === PAGE_LIMIT;
  const routeAvailable = (routeId: string) => context.routes.some((route) => route.id === routeId);

  function navigate(routeId: string) {
    context.navigateToRoute?.(routeId);
  }

  return (
    <article className="grid h-full min-h-[290px] gap-5 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-5 shadow-[var(--shadow-sm)]">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)]">
            Accessi
          </p>
          <h3 className="mt-1 text-base font-semibold text-[color:var(--color-ink)]">
            Utenti, ruoli e permessi
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={!routeAvailable("users")}
          onClick={() => navigate("users")}
        >
          Apri utenti
          <Icon name="arrow-right" />
        </Button>
      </header>

      {error ? (
        <p className="text-sm leading-6 text-[color:var(--color-danger-ink)]">{error}</p>
      ) : (
        <>
          <div className="grid divide-y divide-[color:var(--color-border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <AccessMetric
              label="Utenti"
              value={isLoading ? "…" : hasMoreUsers ? `${PAGE_LIMIT}+` : String(snapshot.users.length)}
              detail={isLoading ? "" : `${activeUsers} attivi`}
              onClick={routeAvailable("users") ? () => navigate("users") : undefined}
            />
            <AccessMetric
              label="Ruoli"
              value={isLoading ? "…" : String(snapshot.roles.length)}
              detail={isLoading ? "" : `${activeRoles} attivi`}
              onClick={routeAvailable("roles") ? () => navigate("roles") : undefined}
            />
            <AccessMetric
              label="Permessi"
              value={isLoading ? "…" : String(snapshot.permissions.length)}
              detail={isLoading ? "" : `${activePermissions} attivi`}
              onClick={routeAvailable("permissions") ? () => navigate("permissions") : undefined}
            />
          </div>

          <section className="grid gap-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[color:var(--color-ink)]">Nuove registrazioni</p>
                <p className="text-xs text-[color:var(--color-ink-muted)]">Ultime 6 settimane</p>
              </div>
              {hasMoreUsers ? (
                <span className="text-xs text-[color:var(--color-ink-subtle)]">Ultimi 200 utenti</span>
              ) : null}
            </div>
            <div className="grid h-20 grid-cols-6 items-end gap-2" aria-label="Andamento registrazioni utenti">
              {registrationTrend.map((bucket) => (
                <div key={bucket.label} className="grid h-full grid-rows-[1fr_auto] gap-1 text-center">
                  <div className="flex items-end rounded-sm bg-[color:var(--color-surface-subtle)]">
                    <span
                      title={`${bucket.label}: ${bucket.count} registrazioni`}
                      className="w-full rounded-sm bg-[color:var(--color-accent)] transition-[height]"
                      style={{ height: `${Math.max(6, bucket.height)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[color:var(--color-ink-subtle)]">{bucket.label}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </article>
  );
}

function AccessMetric({
  detail,
  label,
  onClick,
  value
}: {
  detail: string;
  label: string;
  onClick?: () => void;
  value: string;
}) {
  const content = (
    <>
      <p className="text-xs font-medium text-[color:var(--color-ink-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
        {value}
      </p>
      <p className="mt-1 text-xs text-[color:var(--color-ink-subtle)]">{detail}</p>
    </>
  );

  return onClick ? (
    <button
      type="button"
      className="px-3 py-2 text-left first:pl-0 last:pr-0 hover:text-[color:var(--color-accent-ink)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-focus)]"
      onClick={onClick}
    >
      {content}
    </button>
  ) : (
    <div className="px-3 py-2 first:pl-0 last:pr-0">{content}</div>
  );
}

function buildRegistrationTrend(users: readonly UserRecord[]) {
  const now = new Date();
  const weeks = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(now);
    start.setDate(now.getDate() - (5 - index) * 7 - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return {
      start,
      end,
      label: index === 5 ? "Ora" : `-${5 - index}w`,
      count: 0,
      height: 0
    };
  });

  for (const user of users) {
    const createdAt = new Date(user.createdAt);
    if (Number.isNaN(createdAt.getTime())) continue;
    const bucket = weeks.find((week) => createdAt >= week.start && createdAt < week.end);
    if (bucket) bucket.count += 1;
  }

  const maximum = Math.max(...weeks.map((week) => week.count), 1);
  return weeks.map((week) => ({ ...week, height: (week.count / maximum) * 100 }));
}

function toDisplayError(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Impossibile caricare i dati di accesso.";
}
