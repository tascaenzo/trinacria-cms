import { cn } from "../../../utils/class-names.js";
import { buildFormControlAria, useFormControlIds } from "../form-control/form-control.js";
import type { SwitchProps } from "./switch.types.js";

export function Switch({ className, description, error, id, label, ...props }: SwitchProps) {
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
        "flex items-start justify-between gap-4 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-4",
        error && "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)]",
        className
      )}
    >
      <span className="grid gap-1">
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
          {...props}
          id={ids.controlId}
          type="checkbox"
          role="switch"
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={aria.describedBy}
          aria-errormessage={aria.errorMessage}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-[color:var(--color-interactive-soft)] transition peer-checked:bg-[color:var(--color-action-primary-bg)] peer-focus:ring-2 peer-focus:ring-[color:var(--color-overlay-soft)]" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[color:var(--color-surface)] shadow-sm transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
