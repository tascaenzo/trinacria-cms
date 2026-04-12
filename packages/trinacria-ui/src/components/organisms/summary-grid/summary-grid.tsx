import { Panel } from "../../primitives/panel/panel.js";
import { BodyText } from "../../primitives/text/text.js";
import { cn } from "../../../utils/class-names.js";
import type { SummaryCardProps, SummaryGridProps } from "./summary-grid.types.js";

export function SummaryGrid({ children, className, ...props }: SummaryGridProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-4", className)} {...props}>
      {children}
    </div>
  );
}

export function SummaryCard({
  badge,
  className,
  description,
  label,
  value,
  ...props
}: SummaryCardProps) {
  return (
    <Panel className={cn("p-4", className)} radius="lg" {...props}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[color:var(--color-ink-muted)]">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
            {value}
          </p>
        </div>
        {badge}
      </div>
      {description ? <BodyText className="mt-3" tone="subtle">{description}</BodyText> : null}
    </Panel>
  );
}
