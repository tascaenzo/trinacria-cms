import { forwardRef } from "react";
import { cn } from "../../../utils/class-names.js";
import type { ButtonBaseProps, ButtonSize, ButtonVariant } from "./button-base.types.js";

export function getButtonBaseClassName({
  className,
  iconOnly = false,
  size = "md",
  variant = "primary"
}: Pick<ButtonBaseProps, "className" | "iconOnly" | "size" | "variant">) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-(--radius-control) border font-medium shadow-(--shadow-surface) transition focus:outline-hidden focus:ring-2 focus:ring-(--color-focus) focus:ring-offset-2 focus:ring-offset-(--color-surface) disabled:cursor-not-allowed disabled:opacity-55",
    getButtonSizeClassName(size, iconOnly),
    getButtonVariantClassName(variant),
    className
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
  if (variant === "danger") {
    return "border-(--color-danger-border) bg-(--color-danger-bg) text-(--color-danger-ink) shadow-none hover:brightness-95";
  }
  if (variant === "secondary") {
    return "border-(--color-action-secondary-border) bg-(--color-action-secondary-bg) text-(--color-action-secondary-ink) hover:bg-(--color-action-secondary-hover)";
  }

  if (variant === "outline") {
    return "border-(--color-border-strong) bg-transparent text-(--color-action-secondary-ink) shadow-none hover:bg-(--color-action-secondary-hover)";
  }

  if (variant === "ghost") {
    return "border-(--color-action-ghost-border) bg-(--color-action-ghost-bg) text-(--color-action-ghost-ink) shadow-none hover:border-(--color-border) hover:bg-(--color-action-ghost-hover) hover:text-(--color-ink)";
  }

  return "border-(--color-action-primary-border) bg-(--color-action-primary-bg) text-(--color-action-primary-ink) hover:bg-(--color-action-primary-hover)";
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
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      {...props}
      aria-busy={isLoading || undefined}
      disabled={isLoading || props.disabled}
      className={getButtonBaseClassName({ className, iconOnly, size, variant })}
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
