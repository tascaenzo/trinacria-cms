import { cn } from "../../../utils/class-names.js";
import type { StepperProps } from "./stepper.types.js";

export function Stepper({ items, currentStep, ariaLabel = "Avanzamento" }: StepperProps) {
  const currentIndex = Math.max(
    0,
    items.findIndex((item) => item.id === currentStep)
  );

  return (
    <ol
      className="grid w-full"
      style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
      aria-label={ariaLabel}
    >
      {items.map((item, index) => {
        const isCurrent = index === currentIndex;
        const isComplete = index < currentIndex;
        const isConnectorComplete = index < currentIndex;

        return (
          <li key={item.id} className="relative min-w-0">
            {index > 0 ? (
              <span
                className={cn(
                  "absolute left-0 top-4.5 z-0 h-0.5 w-1/2 rounded-full",
                  index <= currentIndex ? "bg-(--color-accent)" : "bg-(--color-border-strong)"
                )}
                aria-hidden="true"
              />
            ) : null}
            {index < items.length - 1 ? (
              <span
                className={cn(
                  "absolute right-0 top-4.5 z-0 h-0.5 w-1/2 rounded-full",
                  isConnectorComplete ? "bg-(--color-accent)" : "bg-(--color-border-strong)"
                )}
                aria-hidden="true"
              />
            ) : null}
            <div className="relative z-10 flex min-w-0 flex-col items-center text-center">
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 text-xs font-bold shadow-(--shadow-sm)",
                  isComplete &&
                    "border-(--color-accent) bg-(--color-accent) text-(--color-ink-inverse)",
                  isCurrent &&
                    "border-(--color-accent) bg-(--color-accent-soft) text-(--color-accent-ink)",
                  !isComplete &&
                    !isCurrent &&
                    "border-(--color-border-strong) bg-(--color-panel) text-(--color-ink-muted)"
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isComplete ? "✓" : index + 1}
              </span>
              <span
                className={cn(
                  "mt-2 text-xs font-semibold",
                  isComplete
                    ? "text-(--color-accent-ink)"
                    : isCurrent
                      ? "text-(--color-ink)"
                      : "text-(--color-ink-muted)"
                )}
              >
                {item.label}
              </span>
              {item.description ? (
                <span
                  className={cn(
                    "mt-1 hidden text-[11px] leading-4 sm:block",
                    isComplete ? "text-(--color-accent-ink)" : "text-(--color-ink-subtle)"
                  )}
                >
                  {item.description}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
