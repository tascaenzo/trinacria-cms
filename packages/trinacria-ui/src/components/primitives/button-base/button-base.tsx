import { forwardRef } from "react";
import { cn } from "../../../utils/class-names.js";
import type { ButtonBaseProps, ButtonSize, ButtonVariant } from "./button-base.types.js";

export function getButtonBaseClassName({
  className,
  iconOnly = false,
  size = "md",
  variant = "primary",
}: Pick<ButtonBaseProps, "className" | "iconOnly" | "size" | "variant">) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md border font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[color:var(--color-focus)] focus:ring-offset-2 focus:ring-offset-[color:var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-55",
    getButtonSizeClassName(size, iconOnly),
    getButtonVariantClassName(variant),
    className,
  );
}

function getButtonSizeClassName(size: ButtonSize, iconOnly: boolean) {
  if (size === "sm") {
    return iconOnly ? "h-8 w-8 p-0 text-xs" : "h-8 px-3 text-xs";
  }

  if (size === "lg") {
    return iconOnly ? "h-11 w-11 p-0 text-sm" : "h-11 px-4 text-sm";
  }

  return iconOnly ? "h-9 w-9 p-0 text-sm" : "h-9 px-3.5 text-sm";
}

function getButtonVariantClassName(variant: ButtonVariant) {
  if (variant === "secondary") {
    return "border-[color:var(--color-action-secondary-border)] bg-[color:var(--color-action-secondary-bg)] text-[color:var(--color-action-secondary-ink)] hover:bg-[color:var(--color-action-secondary-hover)]";
  }

  if (variant === "outline") {
    return "border-[color:var(--color-action-secondary-border)] bg-[color:var(--color-action-secondary-bg)] text-[color:var(--color-action-secondary-ink)] hover:bg-[color:var(--color-action-secondary-hover)]";
  }

  if (variant === "ghost") {
    return "border-[color:var(--color-action-ghost-border)] bg-[color:var(--color-action-ghost-bg)] text-[color:var(--color-action-ghost-ink)] shadow-none hover:border-[color:var(--color-border)] hover:bg-[color:var(--color-action-ghost-hover)] hover:text-[color:var(--color-ink)]";
  }

  return "border-[color:var(--color-action-primary-border)] bg-[color:var(--color-action-primary-bg)] text-[color:var(--color-action-primary-ink)] hover:bg-[color:var(--color-action-primary-hover)]";
}

/**
 * ButtonBase centralizes the visual grammar for interactive button-like
 * controls so Button, IconButton, and grouped actions stay aligned.
 */
export const ButtonBase = forwardRef<HTMLButtonElement, ButtonBaseProps>(function ButtonBase(
  {
    children,
    className,
    iconOnly = false,
    isLoading = false,
    size = "md",
    type = "button",
    variant = "primary",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-busy={isLoading || undefined}
      disabled={isLoading || props.disabled}
      className={getButtonBaseClassName({ className, iconOnly, size, variant })}
      {...props}
    >
      {isLoading ? (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      ) : null}
      {children}
    </button>
  );
});
