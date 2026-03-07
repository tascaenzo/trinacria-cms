import type { InputHTMLAttributes } from "react";
import { cn } from "../utils/class-names.js";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

/**
 * Input follows a compact admin-focused styling with restrained radius and
 * subtle focus treatment inspired by modern dashboard UIs.
 */
export function Input({ className, hint, label, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="grid gap-2">
      {label ? (
        <span className="text-sm font-medium text-[color:var(--color-ink)]">{label}</span>
      ) : null}
      <input
        id={inputId}
        className={cn(
          "h-10 w-full rounded-lg border border-[color:var(--color-border-strong)] bg-white px-3 text-sm text-[color:var(--color-ink)] outline-none transition placeholder:text-[color:var(--color-ink-subtle)] focus:border-slate-400 focus:ring-2 focus:ring-slate-200",
          className,
        )}
        {...props}
      />
      {hint ? <span className="text-xs leading-5 text-[color:var(--color-ink-subtle)]">{hint}</span> : null}
    </label>
  );
}
