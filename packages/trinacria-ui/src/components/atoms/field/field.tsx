import type {
  HTMLAttributes,
  LabelHTMLAttributes,
  PropsWithChildren,
} from "react";
import { cn } from "../../../utils/class-names.js";

export function FieldGroup({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={cn("grid gap-6", className)} {...props}>
      {children}
    </div>
  );
}

export function Field({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={cn("grid gap-2.5", className)} {...props}>
      {children}
    </div>
  );
}

export function FieldLabel({
  children,
  className,
  ...props
}: PropsWithChildren<LabelHTMLAttributes<HTMLLabelElement>>) {
  return (
    <label
      className={cn("text-sm font-medium text-[color:var(--color-ink)]", className)}
      {...props}
    >
      {children}
    </label>
  );
}

export function FieldDescription({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLParagraphElement>>) {
  return (
    <p
      className={cn("text-sm leading-6 text-[color:var(--color-ink-muted)]", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function FieldHint({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLParagraphElement>>) {
  return (
    <p className={cn("text-xs leading-5 text-[color:var(--color-ink-subtle)]", className)} {...props}>
      {children}
    </p>
  );
}

export function FieldError({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLParagraphElement>>) {
  return (
    <p className={cn("text-xs leading-5 text-[color:var(--color-danger-ink)]", className)} {...props}>
      {children}
    </p>
  );
}
