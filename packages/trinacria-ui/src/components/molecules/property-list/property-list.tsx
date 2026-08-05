import { createContext, useContext } from "react";
import { cn } from "../../../utils/class-names.js";
import type { PropertyItemProps, PropertyListProps } from "./property-list.types.js";

const PropertyListVariantContext =
  createContext<NonNullable<PropertyListProps["variant"]>>("cards");

export function PropertyList({
  children,
  className,
  columns = 1,
  variant = "cards",
  ...props
}: PropertyListProps) {
  return (
    <PropertyListVariantContext.Provider value={variant}>
      <dl
        className={cn(
          variant === "cards" ? "grid gap-3" : "divide-y divide-[color:var(--color-border)]",
          variant === "cards" && columns === 2 && "sm:grid-cols-2",
          variant === "cards" && columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
          className
        )}
        {...props}
      >
        {children}
      </dl>
    </PropertyListVariantContext.Provider>
  );
}

export function PropertyItem({ className, hint, label, value, ...props }: PropertyItemProps) {
  const variant = useContext(PropertyListVariantContext);
  const isKeyValue = variant === "key-value";

  return (
    <div
      className={cn(
        variant === "cards"
          ? "rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] p-4"
          : isKeyValue
            ? "grid gap-0 sm:grid-cols-[minmax(14rem,0.35fr)_minmax(0,1fr)]"
            : "grid gap-1 py-4 sm:grid-cols-[minmax(10rem,0.35fr)_minmax(0,1fr)] sm:gap-6",
        className
      )}
      {...props}
    >
      <dt
        className={cn(
          "text-[11px] font-medium uppercase tracking-[0.14em]",
          isKeyValue
            ? "text-[color:var(--color-ink-muted)]"
            : "text-[color:var(--color-ink-subtle)]",
          isKeyValue && "bg-[color:var(--color-panel-soft)] px-4 pb-1.5 pt-3 sm:px-5 sm:py-3"
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "break-words text-[color:var(--color-ink)]",
          variant === "cards"
            ? "mt-2 text-base font-semibold"
            : isKeyValue
              ? "bg-[color:var(--color-surface)] px-4 pb-3 pt-0 text-sm leading-6 sm:px-5 sm:py-3 sm:text-base"
              : "text-sm leading-6 sm:text-base"
        )}
      >
        {value}
      </dd>
      {hint ? (
        <p
          className={cn(
            "text-xs text-[color:var(--color-ink-muted)]",
            variant === "cards"
              ? "mt-1"
              : isKeyValue
                ? "px-4 pb-3 sm:col-start-2 sm:px-5"
                : "sm:col-start-2"
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
