import { useId } from "react";
import { cn } from "../../../utils/class-names.js";
import type { FormControlShellProps, FormControlSurfaceProps } from "./form-control.types.js";

export function useFormControlIds(id?: string, _name?: string) {
  const reactId = useId().replace(/:/g, "");
  // `name` is a submission key and is commonly reused by repeated controls.
  // Only an explicit id may opt out of React's instance-unique identifier.
  const baseId = id ?? `field-${reactId}`;

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
      ? "min-h-28 w-full rounded-(--radius-control) border bg-(--color-surface) px-3 py-2.5 text-sm"
      : "h-10 w-full rounded-(--radius-control) border bg-(--color-surface) px-3 text-sm",
    "border-(--color-border) text-(--color-ink) outline-hidden transition placeholder:text-(--color-ink-subtle)",
    !disabled && !error && "hover:border-(--color-accent-border)",
    withFocusWithin
      ? "focus-within:border-(--color-border-strong) focus-within:ring-1 focus-within:ring-(--color-accent-border)"
      : "focus:border-(--color-border-strong) focus:ring-1 focus:ring-(--color-accent-border)",
    disabled && "cursor-not-allowed bg-(--color-panel-soft) text-(--color-ink-subtle)",
    Boolean(error) &&
      (withFocusWithin
        ? "border-(--color-danger-border) bg-(--color-danger-bg) focus-within:border-(--color-danger-ink) focus-within:ring-1 focus-within:ring-(--color-danger-border)"
        : "border-(--color-danger-border) bg-(--color-danger-bg) focus:border-(--color-danger-ink) focus:ring-1 focus:ring-(--color-danger-border)"),
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
          className="text-sm font-medium text-(--color-ink)"
        >
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <span id={errorId} className="text-xs leading-5 text-(--color-danger-ink)">
          {error}
        </span>
      ) : null}
      {hint ? (
        <span id={hintId} className="text-xs leading-5 text-(--color-ink-subtle)">
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
