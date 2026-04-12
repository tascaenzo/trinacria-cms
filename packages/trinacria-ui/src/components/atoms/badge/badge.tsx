import { cn } from "../../../utils/class-names.js";
import type { BadgeProps } from "./badge.types.js";

export function Badge({ children, className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        tone === "neutral" &&
          "border-[color:var(--color-neutral-border)] bg-[color:var(--color-neutral-bg)] text-[color:var(--color-neutral-ink)]",
        tone === "info" &&
          "border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] text-[color:var(--color-info-ink)]",
        tone === "success" &&
          "border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]",
        tone === "warning" &&
          "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-ink)]",
        tone === "danger" &&
          "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-ink)]",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
