import { cn } from "../../../utils/class-names.js";
import { Panel } from "../../primitives/panel/panel.js";
import type { InfoCardProps } from "./info-card.types.js";

export function InfoCard({
  action,
  children,
  className,
  description,
  eyebrow,
  title,
  tone = "soft",
  ...props
}: InfoCardProps) {
  return (
    <Panel className={cn("p-4", className)} radius="lg" tone={tone} {...props}>
      {eyebrow || title || description || action ? (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <p
                className={cn(
                  "font-medium text-[color:var(--color-ink)]",
                  eyebrow ? "mt-2" : "text-sm"
                )}
              >
                {title}
              </p>
            ) : null}
            {description ? (
              <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children ? (
        <div className={cn(eyebrow || title || description || action ? "mt-4" : undefined)}>
          {children}
        </div>
      ) : null}
    </Panel>
  );
}
