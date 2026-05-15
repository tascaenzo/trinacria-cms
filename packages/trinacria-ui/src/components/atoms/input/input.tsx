import {
  buildFormControlAria,
  FormControlShell,
  formControlClassName,
  useFormControlIds
} from "../form-control/form-control.js";
import type { InputProps } from "./input.types.js";

/**
 * Input follows a compact admin-focused styling with restrained radius and
 * subtle focus treatment inspired by modern dashboard UIs.
 */
export function Input({ className, error, hint, label, id, ...props }: InputProps) {
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
      <input
        id={ids.controlId}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={aria.describedBy}
        aria-errormessage={aria.errorMessage}
        className={formControlClassName({ className, disabled: props.disabled, error })}
        {...props}
      />
    </FormControlShell>
  );
}
