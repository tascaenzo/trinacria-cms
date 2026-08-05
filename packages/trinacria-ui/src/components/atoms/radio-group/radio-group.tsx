import { cn } from "../../../utils/class-names.js";
import { buildFormControlAria, useFormControlIds } from "../form-control/form-control.js";
import type { RadioGroupProps } from "./radio-group.types.js";

export function RadioGroup({
  className,
  error,
  hint,
  label,
  name,
  onValueChange,
  options,
  orientation = "vertical",
  value,
  ...props
}: RadioGroupProps) {
  const ids = useFormControlIds(props.id, name);
  const aria = buildFormControlAria({
    describedBy: props["aria-describedby"],
    error,
    errorId: ids.errorId,
    hint,
    hintId: ids.hintId
  });

  return (
    <fieldset
      {...props}
      className={cn("grid gap-2.5", className)}
      aria-describedby={aria.describedBy}
      aria-errormessage={aria.errorMessage}
      aria-invalid={error ? true : undefined}
    >
      {label ? (
        <legend id={ids.labelId} className="text-sm font-medium text-[color:var(--color-ink)]">
          {label}
        </legend>
      ) : null}
      <div className={cn("grid gap-3", orientation === "horizontal" && "sm:grid-cols-3")}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex items-start gap-3 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-4",
              option.disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              onChange={() => onValueChange?.(option.value)}
              aria-describedby={
                option.description ? `${ids.controlId}-${option.value}-description` : undefined
              }
              className="mt-0.5 h-4 w-4 border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] text-[color:var(--color-action-primary-bg)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus)]"
            />
            <span className="grid gap-1">
              <span className="text-sm font-medium text-[color:var(--color-ink)]">
                {option.label}
              </span>
              {option.description ? (
                <span
                  id={`${ids.controlId}-${option.value}-description`}
                  className="text-sm leading-6 text-[color:var(--color-ink-muted)]"
                >
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      {error ? (
        <span id={ids.errorId} className="text-xs leading-5 text-[color:var(--color-danger-ink)]">
          {error}
        </span>
      ) : null}
      {hint ? (
        <span id={ids.hintId} className="text-xs leading-5 text-[color:var(--color-ink-subtle)]">
          {hint}
        </span>
      ) : null}
    </fieldset>
  );
}
