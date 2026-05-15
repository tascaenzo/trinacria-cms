import { useId } from "react";
import { cn } from "../../../utils/class-names.js";
import type { FormControlShellProps, FormControlSurfaceProps } from "./form-control.types.js";

export function useFormControlIds(id?: string, name?: string) {
  const reactId = useId().replace(/:/g, "");
  const baseId = id ?? name ?? `field-${reactId}`;

  return {
    controlId: baseId,
    errorId: `${baseId}-error`,
    hintId: `${baseId}-hint`,
    labelId: `${baseId}-label`
  };
}

export function buildFormControlAria(options: {
  describedBy?: string;
  error?: unknown;
  errorId: string;
  hint?: unknown;
  hintId: string;
}) {
  const ids = [
    options.describedBy,
    options.hint ? options.hintId : null,
    options.error ? options.errorId : null
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    describedBy: ids || undefined,
    errorMessage: options.error ? options.errorId : undefined
  };
}

export function formControlClassName(options?: {
  className?: string;
  disabled?: boolean;
  error?: unknown;
  multiline?: boolean;
  withFocusWithin?: boolean;
}) {
  const {
    className,
    disabled = false,
    error,
    multiline = false,
    withFocusWithin = false
  } = options ?? {};

  return cn(
    multiline
      ? "min-h-28 w-full rounded-[var(--radius-control)] border bg-[color:var(--color-surface)] px-3 py-2.5 text-sm"
      : "h-10 w-full rounded-[var(--radius-control)] border bg-[color:var(--color-surface)] px-3 text-sm",
    "border-[color:var(--color-border-strong)] text-[color:var(--color-ink)] outline-none transition placeholder:text-[color:var(--color-ink-subtle)]",
    withFocusWithin
      ? "focus-within:border-[color:var(--color-focus)] focus-within:ring-2 focus-within:ring-[color:var(--color-overlay-soft)]"
      : "focus:border-[color:var(--color-focus)] focus:ring-2 focus:ring-[color:var(--color-overlay-soft)]",
    disabled &&
      "cursor-not-allowed bg-[color:var(--color-panel-soft)] text-[color:var(--color-ink-subtle)]",
    Boolean(error) &&
      (withFocusWithin
        ? "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] focus-within:border-[color:var(--color-danger-ink)] focus-within:ring-[color:var(--color-danger-border)]"
        : "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] focus:border-[color:var(--color-danger-ink)] focus:ring-[color:var(--color-danger-border)]"),
    className
  );
}

export function FormControlShell({
  children,
  className,
  controlId,
  error,
  errorId,
  hint,
  hintId,
  label,
  labelFor,
  labelId,
  ...props
}: FormControlShellProps) {
  return (
    <div className={cn("grid gap-2", className)} {...props}>
      {label ? (
        <label
          htmlFor={labelFor ?? controlId}
          id={labelId}
          className="text-sm font-medium text-[color:var(--color-ink)]"
        >
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <span id={errorId} className="text-xs leading-5 text-[color:var(--color-danger-ink)]">
          {error}
        </span>
      ) : null}
      {hint ? (
        <span id={hintId} className="text-xs leading-5 text-[color:var(--color-ink-subtle)]">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function FormControlSurface({
  children,
  className,
  disabled = false,
  error,
  ...props
}: FormControlSurfaceProps) {
  return (
    <div
      className={formControlClassName({ className, disabled, error, withFocusWithin: true })}
      {...props}
    >
      {children}
    </div>
  );
}
