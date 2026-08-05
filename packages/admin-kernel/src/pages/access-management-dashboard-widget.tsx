import type { PermissionsApi, RolesApi, UsersApi } from "@trinacria-cms/sdk";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardHeading,
  ErrorBanner,
  Icon
} from "@trinacria-cms/trinacria-ui";
import { useEffect, useMemo, useState } from "react";
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
    <Card className="h-full min-h-[290px]" padding="none" elevation="none">
      <CardHeader>
        <CardHeading
          icon="users"
          title="Gestione accessi"
          description="Utenti, ruoli e autorizzazioni"
          actions={
            <Button
              variant="secondary"
              size="sm"
              disabled={!routeAvailable("users")}
              onClick={() => navigate("users")}
            >
              Gestisci
              <Icon name="arrow-right" />
            </Button>
          }
        />
      </CardHeader>

      <CardContent className="grid gap-5">
        {error ? (
          <ErrorBanner message={error} />
        ) : (
          <>
            <div className="-mx-5 -mt-5 grid divide-y divide-[color:var(--color-border)] border-b border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <AccessMetric
                label="Utenti"
                value={
                  isLoading ? "…" : hasMoreUsers ? `${PAGE_LIMIT}+` : String(snapshot.users.length)
                }
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
                  <p className="text-sm font-medium text-[color:var(--color-ink)]">
                    Nuove registrazioni
                  </p>
                  <p className="text-xs text-[color:var(--color-ink-muted)]">Ultime 6 settimane</p>
                </div>
                {hasMoreUsers ? (
                  <span className="text-xs text-[color:var(--color-ink-subtle)]">
                    Ultimi 200 utenti
                  </span>
                ) : null}
              </div>
              <div
                className="grid h-20 grid-cols-6 items-end gap-2"
                aria-label="Andamento registrazioni utenti"
              >
                {registrationTrend.map((bucket) => (
                  <div
                    key={bucket.label}
                    className="grid h-full grid-rows-[1fr_auto] gap-1 text-center"
                  >
                    <div className="flex items-end rounded-sm bg-[color:var(--color-surface-subtle)]">
                      <span
                        title={`${bucket.label}: ${bucket.count} registrazioni`}
                        className="w-full rounded-sm bg-[color:var(--color-accent)] transition-[height]"
                        style={{ height: `${Math.max(6, bucket.height)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[color:var(--color-ink-subtle)]">
                      {bucket.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </CardContent>
    </Card>
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
      <span className="text-xs font-medium text-[color:var(--color-ink-muted)]">{label}</span>
      <span className="mt-2 flex items-baseline justify-between gap-3">
        <span className="text-2xl font-semibold tabular-nums text-[color:var(--color-ink)]">
          {value}
        </span>
        <span className="text-xs text-[color:var(--color-ink-subtle)]">{detail}</span>
      </span>
    </>
  );

  return onClick ? (
    <Button
      type="button"
      variant="ghost"
      className="h-auto w-full flex-col items-stretch rounded-none border-0 px-5 py-4 text-left shadow-none focus:ring-inset"
      onClick={onClick}
    >
      {content}
    </Button>
  ) : (
    <div className="px-5 py-4">{content}</div>
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
    return { start, end, label: index === 5 ? "Ora" : `-${5 - index}w`, count: 0, height: 0 };
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
  return error instanceof Error && error.message
    ? error.message
    : "Impossibile caricare i dati di accesso.";
}
