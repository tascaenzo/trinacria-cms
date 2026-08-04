import { cn } from "../../../utils/class-names.js";
import { buildFormControlAria, useFormControlIds } from "../form-control/form-control.js";
import type { SwitchProps } from "./switch.types.js";

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { className, compact = false, description, error, id, label, ...props }: SwitchProps,
  ref
) {
  const ids = useFormControlIds(id, props.name);
  const descriptionId = description ? `${ids.controlId}-description` : undefined;
  const aria = buildFormControlAria({
    describedBy: [props["aria-describedby"], descriptionId].filter(Boolean).join(" "),
    error,
    errorId: ids.errorId,
    hint: undefined,
    hintId: ids.hintId
  });

  return (
    <label
      htmlFor={ids.controlId}
      className={cn(
        compact
          ? "inline-flex items-center border-0 bg-transparent p-0"
          : "flex items-start justify-between gap-4 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-4",
        Boolean(error) &&
          "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)]",
        className
      )}
    >
      <span className={cn("grid gap-1", compact && "sr-only")}>
        <span className="text-sm font-medium text-[color:var(--color-ink)]">{label}</span>
        {description ? (
          <span
            id={descriptionId}
            className="text-sm leading-6 text-[color:var(--color-ink-muted)]"
          >
            {description}
          </span>
        ) : null}
        {error ? (
          <span id={ids.errorId} className="text-xs leading-5 text-[color:var(--color-danger-ink)]">
            {error}
          </span>
        ) : null}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          ref={ref}
          {...props}
          id={ids.controlId}
          type="checkbox"
          role="switch"
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={aria.describedBy}
          aria-errormessage={aria.errorMessage}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-[color:var(--color-interactive-soft)] transition peer-checked:bg-[color:var(--color-action-primary-bg)] peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--color-focus)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[color:var(--color-surface)]" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[color:var(--color-surface)] shadow-sm transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
});

import { forwardRef } from "react";
