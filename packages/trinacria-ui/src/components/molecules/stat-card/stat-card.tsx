import { cn } from "../../../utils/class-names.js";
import { Icon } from "../../atoms/icon/icon.js";
import { Card } from "../card/card.js";
import type { StatCardProps } from "./stat-card.types.js";

export function StatCard({
  badge,
  className,
  description,
  icon,
  label,
  meta,
  tone = "neutral",
  value,
  ...props
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "border-l-[3px] p-4",
        tone === "neutral" &&
          "border-l-[color:var(--color-accent)] border-y-[color:var(--color-border)] border-r-[color:var(--color-border)]",
        tone === "info" && "border-[color:var(--color-info-border)]",
        tone === "success" && "border-[color:var(--color-success-border)]",
        tone === "warning" && "border-[color:var(--color-warning-border)]",
        tone === "danger" && "border-[color:var(--color-danger-border)]",
        className
      )}
      title={undefined}
      eyebrow={undefined}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-[color:var(--color-ink-muted)]">{label}</p>
            {meta ? (
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
                {meta}
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
            {value}
          </p>
        </div>
        {badge ? (
          <div className="shrink-0">{badge}</div>
        ) : icon ? (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border",
              tone === "neutral" &&
                "border-[color:var(--color-accent-border)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)]",
              tone === "info" &&
                "border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] text-[color:var(--color-info-ink)]",
              tone === "success" &&
                "border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]",
              tone === "warning" &&
                "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-ink)]",
              tone === "danger" &&
                "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-ink)]"
            )}
          >
            <Icon name={icon} className="h-5 w-5" />
          </div>
        ) : null}
      </div>
      {description ? (
        <p className="mt-3 text-sm leading-6 text-[color:var(--color-ink-subtle)]">{description}</p>
      ) : null}
    </Card>
  );
}
