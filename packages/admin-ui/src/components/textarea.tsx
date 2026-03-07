import type { TextareaHTMLAttributes } from "react";
import { cn } from "../utils/class-names.js";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export function Textarea({ className, hint, label, id, ...props }: TextareaProps) {
  const inputId = id ?? props.name;

  return (
    <label className="grid gap-2">
      {label ? <span className="text-sm font-medium text-[color:var(--color-ink)]">{label}</span> : null}
      <textarea
        id={inputId}
        className={cn(
          "min-h-28 w-full rounded-lg border border-[color:var(--color-border-strong)] bg-white px-3 py-2.5 text-sm text-[color:var(--color-ink)] outline-none transition placeholder:text-[color:var(--color-ink-subtle)] focus:border-slate-400 focus:ring-2 focus:ring-slate-200",
          className,
        )}
        {...props}
      />
      {hint ? <span className="text-xs leading-5 text-[color:var(--color-ink-subtle)]">{hint}</span> : null}
    </label>
  );
}
