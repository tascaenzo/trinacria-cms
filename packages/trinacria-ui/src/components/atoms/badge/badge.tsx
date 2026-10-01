import { cn } from "../../../utils/class-names.js";
import type { BadgeProps } from "./badge.types.js";

export function Badge({ children, className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-(--radius-badge) border px-2 py-0.5 text-xs font-medium",
        tone === "neutral" &&
          "border-(--color-neutral-border) bg-(--color-neutral-bg) text-(--color-neutral-ink)",
        tone === "accent" &&
          "border-(--color-accent-border) bg-(--color-accent-soft) text-(--color-accent-ink)",
        tone === "info" &&
          "border-(--color-info-border) bg-(--color-info-bg) text-(--color-info-ink)",
        tone === "success" &&
          "border-(--color-success-border) bg-(--color-success-bg) text-(--color-success-ink)",
        tone === "warning" &&
          "border-(--color-warning-border) bg-(--color-warning-bg) text-(--color-warning-ink)",
        tone === "danger" &&
          "border-(--color-danger-border) bg-(--color-danger-bg) text-(--color-danger-ink)",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
