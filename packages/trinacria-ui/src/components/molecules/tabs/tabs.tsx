import { useId, useRef, type KeyboardEvent } from "react";
import { cn } from "../../../utils/class-names.js";
import type { TabsProps } from "./tabs.types.js";

export function Tabs({
  ariaLabel = "Sezioni",
  children,
  className,
  items,
  onValueChange,
  panelClassName,
  value,
  ...props
}: TabsProps) {
  const generatedId = useId().replace(/:/g, "");
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const enabledItems = items.filter((item) => !item.disabled);
  const activeItem = items.find((item) => item.value === value) ?? enabledItems[0];
  const baseId = `tabs-${generatedId}`;

  function selectAdjacentTab(event: KeyboardEvent<HTMLButtonElement>, currentValue: string) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = enabledItems.findIndex((item) => item.value === currentValue);
    let nextIndex = currentIndex;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = enabledItems.length - 1;
    if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length;
    }
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % enabledItems.length;
    }
    const nextItem = enabledItems[nextIndex];
    if (!nextItem) return;
    onValueChange(nextItem.value);
    tabRefs.current.get(nextItem.value)?.focus();
  }

  return (
    <div className={cn("min-w-0", className)} {...props}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex gap-6 overflow-x-auto border-b border-[color:var(--color-border)]"
      >
        {items.map((item) => {
          const isActive = item.value === activeItem?.value;
          const tabId = `${baseId}-${toSafeId(item.value)}-tab`;
          return (
            <button
              key={item.value}
              ref={(element) => {
                if (element) tabRefs.current.set(item.value, element);
                else tabRefs.current.delete(item.value);
              }}
              id={tabId}
              type="button"
              role="tab"
              aria-controls={`${baseId}-panel`}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              disabled={item.disabled}
              className={cn(
                "relative inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-0.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                isActive
                  ? "border-[color:var(--color-accent)] text-[color:var(--color-ink)]"
                  : "border-transparent text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-ink)]"
              )}
              onClick={() => onValueChange(item.value)}
              onKeyDown={(event) => selectAdjacentTab(event, item.value)}
            >
              <span>{item.label}</span>
              {item.count !== undefined ? (
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold leading-4",
                    isActive
                      ? "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)]"
                      : "bg-[color:var(--color-surface-subtle)] text-[color:var(--color-ink-subtle)]"
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={activeItem ? `${baseId}-${toSafeId(activeItem.value)}-tab` : undefined}
        tabIndex={0}
        className={cn("outline-none", panelClassName)}
      >
        {children}
      </div>
    </div>
  );
}

function toSafeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}
