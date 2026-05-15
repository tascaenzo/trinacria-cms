import { cn } from "../../../utils/class-names.js";
import type { BodyTextProps } from "./text.types.js";

export function BodyText({ children, className, tone = "muted", ...props }: BodyTextProps) {
  return (
    <p
      className={cn(
        "text-sm leading-6",
        tone === "default" && "text-[color:var(--color-ink)]",
        tone === "muted" && "text-[color:var(--color-ink-muted)]",
        tone === "subtle" && "text-[color:var(--color-ink-subtle)]",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}
