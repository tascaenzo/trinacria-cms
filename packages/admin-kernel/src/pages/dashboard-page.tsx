import type { AdminPageRenderContext } from "../runtime/admin-route-runtime.js";
import { Badge, Button, Card, JsonView } from "@trinacria-cms/admin-ui";

export interface DashboardPageProps {
  pluginCount: number;
  capabilityCount: number;
  systemStateLabel: string;
}

/**
 * DashboardPage follows a denser operational layout with KPI cards, a system
 * summary panel, and a debug snapshot area.
 */
export function DashboardPage({ capabilityCount, pluginCount, systemStateLabel }: DashboardPageProps) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold tracking-[-0.02em] text-[color:var(--color-ink)]">Overview</h3>
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            Operational summary of the running CMS instance and the current plugin surface.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary">Export snapshot</Button>
          <Button>View runtime graph</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Installed plugins" value={String(pluginCount)} description="Loaded or registered runtime modules." />
        <MetricCard label="Capabilities" value={String(capabilityCount)} description="Published across installed plugins." />
        <MetricCard label="System state" value={systemStateLabel} description="Aggregated kernel health state." tone={systemStateLabel === "ok" ? "success" : "warning"} />
        <MetricCard label="Admin model" value="plugin-first" description="Shell routes come from contribution contracts." />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card eyebrow="Runtime activity" title="What the shell is doing">
          <div className="grid gap-3">
            <ActivityRow title="Discovery bootstrap" text="The backoffice reads installation state, authenticated user, plugin list, and capability catalog before exposing pages." />
            <ActivityRow title="Visibility gating" text="Navigation items are mounted only when the related plugin is installed and the required capability is published." />
            <ActivityRow title="Custom contribution slot" text="Monorepo plugins can extend the shell through typed admin contributions without modifying the official registry." />
          </div>
        </Card>

        <Card eyebrow="Debug snapshot" title="Kernel summary JSON">
          <JsonView
            value={{
              pluginCount,
              capabilityCount,
              systemStateLabel,
            }}
          />
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  description,
  label,
  tone = "neutral",
  value,
}: {
  description: string;
  label: string;
  tone?: "neutral" | "success" | "warning";
  value: string;
}) {
  return (
    <Card className="p-4" title={undefined} eyebrow={undefined}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[color:var(--color-ink-muted)]">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">{value}</p>
        </div>
        <Badge tone={tone}>{tone === "neutral" ? "info" : tone}</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-[color:var(--color-ink-subtle)]">{description}</p>
    </Card>
  );
}

function ActivityRow({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] p-4">
      <p className="text-sm font-medium text-[color:var(--color-ink)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">{text}</p>
    </div>
  );
}

export function createDashboardRender(props: DashboardPageProps) {
  return (_context: AdminPageRenderContext) => <DashboardPage {...props} />;
}
