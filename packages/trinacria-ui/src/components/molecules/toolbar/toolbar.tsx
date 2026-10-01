import { forwardRef } from "react";
import { cn } from "../../../utils/class-names.js";
import { Icon } from "../../atoms/icon/icon.js";
import { ButtonBase } from "../../primitives/button-base/button-base.js";
import type { ToolbarButtonProps, ToolbarProps, ToolbarSelectProps } from "./toolbar.types.js";

/** Compact actions with normal tab navigation, suitable for editors and inspectors. */
export function Toolbar({
  label,
  className,
  hiddenUntilFocus = false,
  wrap = false,
  ...props
}: ToolbarProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        hiddenUntilFocus ? "hidden" : "flex",
        wrap ? "flex-wrap" : "flex-nowrap",
        "items-center gap-1 rounded-[var(--radius-control)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-1 shadow-[var(--shadow-surface)]",
        className
      )}
      {...props}
    />
  );
}

export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  function ToolbarButton({ label, icon, children, className, variant = "ghost", ...props }, ref) {
    return (
      <ButtonBase
        ref={ref}
        variant={variant}
        size="sm"
        iconOnly={!!icon && !children}
        aria-label={label}
        title={label}
        className={cn(
          "h-8 shrink-0 aria-pressed:border-[color:var(--color-border-strong)] aria-pressed:bg-[color:var(--color-panel-strong)] aria-pressed:text-[color:var(--color-ink)]",
          className
        )}
        {...props}
      >
        {icon ? <Icon name={icon} className="h-4 w-4" /> : null}
        {children}
      </ButtonBase>
    );
  }
);

export const ToolbarSelect = forwardRef<HTMLSelectElement, ToolbarSelectProps>(
  function ToolbarSelect({ label, className, ...props }, ref) {
    return (
      <select
        ref={ref}
        aria-label={label}
        className={cn(
          "h-8 min-w-0 rounded-[var(--radius-control)] border border-transparent bg-[color:var(--color-surface)] px-2 text-xs font-medium text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-interactive-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-55",
          className
        )}
        {...props}
      />
    );
  }
);
