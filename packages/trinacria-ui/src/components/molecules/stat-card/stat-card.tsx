import { cn } from "../../../utils/class-names.js";
import { Card, CardContent, CardHeader, CardHeading } from "../card/card.js";
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
        "h-full",
        tone === "info" && "border-[color:var(--color-info-border)]",
        tone === "success" && "border-[color:var(--color-success-border)]",
        tone === "warning" && "border-[color:var(--color-warning-border)]",
        tone === "danger" && "border-[color:var(--color-danger-border)]",
        className
      )}
      padding="none"
      elevation="none"
      {...props}
    >
      <CardHeader>
        <CardHeading
          title={label}
          description={description}
          icon={icon}
          actions={
            badge ??
            (meta ? (
              <span className="text-xs font-medium text-[color:var(--color-ink-subtle)]">
                {meta}
              </span>
            ) : undefined)
          }
        />
      </CardHeader>
      <CardContent className="py-4">
        <p className="text-3xl font-semibold tracking-[-0.03em] tabular-nums text-[color:var(--color-ink)]">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
