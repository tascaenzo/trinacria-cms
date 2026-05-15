import { cn } from "../../../utils/class-names.js";
import {
  buildFormControlAria,
  FormControlShell,
  FormControlSurface,
  useFormControlIds
} from "../form-control/form-control.js";
import type { NumberInputProps } from "./number-input.types.js";

export function NumberInput({
  className,
  error,
  hint,
  label,
  id,
  prefix,
  suffix,
  ...props
}: NumberInputProps) {
  const ids = useFormControlIds(id, props.name);
  const aria = buildFormControlAria({
    describedBy: props["aria-describedby"],
    error,
    errorId: ids.errorId,
    hint,
    hintId: ids.hintId
  });

  return (
    <FormControlShell
      controlId={ids.controlId}
      error={error}
      errorId={ids.errorId}
      hint={hint}
      hintId={ids.hintId}
      label={label}
      labelFor={ids.controlId}
      labelId={ids.labelId}
    >
      <FormControlSurface
        error={error}
        disabled={props.disabled}
        className="flex items-center overflow-hidden"
      >
        {prefix ? (
          <span className="border-r border-[color:var(--color-border)] px-3 text-[color:var(--color-ink-subtle)]">
            {prefix}
          </span>
        ) : null}
        <input
          id={ids.controlId}
          type="number"
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={aria.describedBy}
          aria-errormessage={aria.errorMessage}
          className={cn(
            "h-full w-full bg-transparent px-3 text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-ink-subtle)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-panel-soft)] disabled:text-[color:var(--color-ink-subtle)]",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            className
          )}
          {...props}
        />
        {suffix ? (
          <span className="border-l border-[color:var(--color-border)] px-3 text-[color:var(--color-ink-subtle)]">
            {suffix}
          </span>
        ) : null}
      </FormControlSurface>
    </FormControlShell>
  );
}
