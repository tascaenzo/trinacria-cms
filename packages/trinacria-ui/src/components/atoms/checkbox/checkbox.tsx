import { cn } from "../../../utils/class-names.js";
import { buildFormControlAria, useFormControlIds } from "../form-control/form-control.js";
import type { CheckboxProps } from "./checkbox.types.js";

export function Checkbox({ className, description, error, id, label, ...props }: CheckboxProps) {
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
        "grid gap-2 rounded-sm border border-transparent p-1",
        error && "text-[color:var(--color-danger-ink)]",
        className
      )}
    >
      <span className="flex items-start gap-3">
        <input
          {...props}
          id={ids.controlId}
          type="checkbox"
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={aria.describedBy}
          aria-errormessage={aria.errorMessage}
          className="mt-0.5 h-4 w-4 rounded border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] text-[color:var(--color-action-primary-bg)] focus:ring-2 focus:ring-[color:var(--color-overlay-soft)]"
        />
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
        </span>
      </span>
      {error ? (
        <span
          id={ids.errorId}
          className="pl-7 text-xs leading-5 text-[color:var(--color-danger-ink)]"
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}
