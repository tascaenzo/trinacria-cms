import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../utils/class-names.js";

export interface ButtonProps
  extends PropsWithChildren,
    ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
}

/**
 * Button follows the shell rhythm used across the dashboard: compact sizing,
 * restrained radius, and contrast-first variants instead of decorative chrome.
 */
export function Button({
  children,
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md border px-3.5 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[color:var(--color-focus)] focus:ring-offset-2 focus:ring-offset-[color:var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-55",
        variant === "primary" &&
          "border-slate-900 bg-slate-900 text-white hover:bg-slate-800",
        variant === "secondary" &&
          "border-[color:var(--color-border)] bg-white text-[color:var(--color-ink)] hover:bg-slate-50",
        variant === "outline" &&
          "border-[color:var(--color-border)] bg-white text-[color:var(--color-ink)] hover:bg-slate-50",
        variant === "ghost" &&
          "border-transparent bg-transparent text-[color:var(--color-ink-muted)] shadow-none hover:border-[color:var(--color-border)] hover:bg-slate-100 hover:text-[color:var(--color-ink)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
