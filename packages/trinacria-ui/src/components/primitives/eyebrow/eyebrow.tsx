import { cn } from "../../../utils/class-names.js";
import type { EyebrowProps } from "./eyebrow.types.js";

export function Eyebrow({ children, className, ...props }: EyebrowProps) {
  return (
    <p
      className={cn(
        "text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--color-ink-subtle)]",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}
