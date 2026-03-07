import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../utils/class-names.js";

export interface BadgeProps extends PropsWithChildren, HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "success" | "warning" | "danger";
}

export function Badge({ children, className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium shadow-sm",
        tone === "neutral" && "border-[color:var(--color-border)] bg-white text-slate-600",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
        tone === "danger" && "border-rose-200 bg-rose-50 text-rose-700",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
