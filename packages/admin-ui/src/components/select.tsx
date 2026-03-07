import type { PropsWithChildren, SelectHTMLAttributes } from "react";
import { cn } from "../utils/class-names.js";

export interface SelectProps extends PropsWithChildren, SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
}

export function Select({ children, className, hint, label, id, ...props }: SelectProps) {
  const inputId = id ?? props.name;

  return (
    <label className="grid gap-2">
      {label ? <span className="text-sm font-medium text-[color:var(--color-ink)]">{label}</span> : null}
      <select
        id={inputId}
        className={cn(
          "h-10 w-full rounded-lg border border-[color:var(--color-border-strong)] bg-white px-3 text-sm text-[color:var(--color-ink)] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {hint ? <span className="text-xs leading-5 text-[color:var(--color-ink-subtle)]">{hint}</span> : null}
    </label>
  );
}
