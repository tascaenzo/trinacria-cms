import { cn } from "../../../utils/class-names.js";
import type { PropertyItemProps, PropertyListProps } from "./property-list.types.js";

export function PropertyList({ children, className, columns = 1, ...props }: PropertyListProps) {
  return (
    <dl
      className={cn(
        "grid gap-3",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
      {...props}
    >
      {children}
    </dl>
  );
}

export function PropertyItem({ className, hint, label, value, ...props }: PropertyItemProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] p-4",
        className
      )}
      {...props}
    >
      <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
        {label}
      </dt>
      <dd className="mt-2 break-words text-base font-semibold text-[color:var(--color-ink)]">
        {value}
      </dd>
      {hint ? <p className="mt-1 text-xs text-[color:var(--color-ink-muted)]">{hint}</p> : null}
    </div>
  );
}
