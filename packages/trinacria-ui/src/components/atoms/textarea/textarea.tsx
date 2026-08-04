import {
  buildFormControlAria,
  FormControlShell,
  formControlClassName,
  useFormControlIds
} from "../form-control/form-control.js";
import type { TextareaProps } from "./textarea.types.js";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, containerClassName, error, hint, label, id, ...props },
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
      <textarea
        ref={ref}
        {...props}
        id={ids.controlId}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={aria.describedBy}
        aria-errormessage={aria.errorMessage}
        className={formControlClassName({
          className,
          disabled: props.disabled,
          error,
          multiline: true
        })}
      />
    </FormControlShell>
  );
});

import { forwardRef } from "react";
