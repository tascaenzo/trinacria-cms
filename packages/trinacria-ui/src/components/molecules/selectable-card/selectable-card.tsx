import { forwardRef } from "react";
import { cn } from "../../../utils/class-names.js";
import type { SelectableCardProps } from "./selectable-card.types.js";

export const SelectableCard = forwardRef<HTMLButtonElement, SelectableCardProps>(
  function SelectableCard(
    { children, className, padding = "md", selected = false, type = "button", ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-pressed={props["aria-pressed"] ?? selected}
        className={cn(
          "block w-full rounded-[var(--radius-panel)] border text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-55",
          selected
            ? "border-[color:var(--color-border-strong)] bg-[color:var(--color-panel-strong)] text-[color:var(--color-ink)]"
            : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-panel-soft)] hover:text-[color:var(--color-ink)]",
          padding === "sm" ? "px-3 py-2" : "p-4",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
