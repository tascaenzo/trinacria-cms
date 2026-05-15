import {
  buildFormControlAria,
  FormControlShell,
  formControlClassName,
  useFormControlIds
} from "../form-control/form-control.js";
import { Icon } from "../icon/icon.js";
import type { SelectProps } from "./select.types.js";

export function Select({ children, className, error, hint, label, id, ...props }: SelectProps) {
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
      <div className="relative">
        <select
          id={ids.controlId}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={aria.describedBy}
          aria-errormessage={aria.errorMessage}
          className={formControlClassName({
            className: `appearance-none pr-10 ${className ?? ""}`,
            disabled: props.disabled,
            error
          })}
          {...props}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[color:var(--color-ink-subtle)]">
          <Icon name="chevron-down" className="h-4 w-4" />
        </span>
      </div>
    </FormControlShell>
  );
}
