import { type KeyboardEvent, useId, useRef } from "react";
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
        className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-(--radius-md) bg-(--color-panel-strong) p-1"
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
                "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-(--radius-sm) px-3 text-sm font-medium transition-[color,background-color,box-shadow] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-focus) focus-visible:ring-offset-1 focus-visible:ring-offset-(--color-panel-strong) disabled:cursor-not-allowed disabled:opacity-45",
                isActive
                  ? "bg-(--color-surface) text-(--color-ink) shadow-(--shadow-sm)"
                  : "text-(--color-ink-muted) hover:bg-(--color-surface)/50 hover:text-(--color-ink)"
              )}
              onClick={() => onValueChange(item.value)}
              onKeyDown={(event) => selectAdjacentTab(event, item.value)}
            >
              <span>{item.label}</span>
              {item.count !== undefined ? (
                <span
                  className={cn(
                    "text-[11px] font-medium leading-none tabular-nums",
                    isActive ? "text-(--color-ink-muted)" : "text-(--color-ink-subtle)"
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
        className={cn("outline-hidden", panelClassName)}
      >
        {children}
      </div>
    </div>
  );
}

function toSafeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}
