import { cn } from "../../../utils/class-names.js";
import {
  buildFormControlAria,
  FormControlShell,
  FormControlSurface,
  useFormControlIds
} from "../form-control/form-control.js";
import type { NumberInputProps } from "./number-input.types.js";

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {
    className,
    containerClassName,
    error,
    hint,
    label,
    id,
    prefix,
    suffix,
    ...props
  }: NumberInputProps,
  ref
) {
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
      className={containerClassName}
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
          <span className="border-r border-(--color-border) px-3 text-(--color-ink-subtle)">
            {prefix}
          </span>
        ) : null}
        <input
          ref={ref}
          {...props}
          id={ids.controlId}
          type="number"
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={aria.describedBy}
          aria-errormessage={aria.errorMessage}
          className={cn(
            "h-full w-full bg-transparent px-3 text-(--color-ink) outline-hidden placeholder:text-(--color-ink-subtle) disabled:cursor-not-allowed disabled:bg-(--color-panel-soft) disabled:text-(--color-ink-subtle)",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            className
          )}
        />
        {suffix ? (
          <span className="border-l border-(--color-border) px-3 text-(--color-ink-subtle)">
            {suffix}
          </span>
        ) : null}
      </FormControlSurface>
    </FormControlShell>
  );
});

import { forwardRef } from "react";
