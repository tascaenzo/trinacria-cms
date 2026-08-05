import { cn } from "../../../utils/class-names.js";
import { Icon } from "../../atoms/icon/icon.js";
import type { DisclosureProps } from "./disclosure.types.js";

export function Disclosure({
  children,
  className,
  contentClassName,
  summary,
  summaryClassName,
  ...props
}: DisclosureProps) {
  return (
    <details
      className={cn(
        "group overflow-hidden rounded-[var(--radius-panel)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]",
        className
      )}
      {...props}
    >
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[color:var(--color-ink)] transition hover:bg-[color:var(--color-panel-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-focus)] [&::-webkit-details-marker]:hidden",
          summaryClassName
        )}
      >
        <span className="min-w-0">{summary}</span>
        <Icon
          name="chevron-down"
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-[color:var(--color-ink-subtle)] transition group-open:rotate-180"
        />
      </summary>
      <div
        className={cn(
          "border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4",
          contentClassName
        )}
      >
        {children}
      </div>
    </details>
  );
}
