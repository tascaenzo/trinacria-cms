import { cn } from "../../../utils/class-names.js";
import type { PanelProps } from "./panel.types.js";

export function Panel({
  children,
  className,
  elevation = "none",
  radius = "xl",
  tone = "default",
  ...props
}: PanelProps) {
  return (
    <div
      className={cn(
        "border",
        radius === "lg" && "rounded-xl",
        radius === "xl" && "rounded-2xl",
        tone === "default" && "border-[color:var(--color-border)] bg-[color:var(--color-surface)]",
        tone === "soft" && "border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)]",
        tone === "dashed" &&
          "border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-panel-soft)]",
        elevation === "sm" && "shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
