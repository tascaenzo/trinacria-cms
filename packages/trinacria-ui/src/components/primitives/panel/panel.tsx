import { cn } from "../../../utils/class-names.js";
import type { PanelProps } from "./panel.types.js";

export function Panel({
  as: Component = "div",
  children,
  className,
  elevation = "none",
  radius = "lg",
  tone = "default",
  ...props
}: PanelProps) {
  return (
    <Component
      className={cn(
        "border",
        radius === "lg" && "rounded-(--radius-panel)",
        radius === "xl" && "rounded-(--radius-overlay)",
        tone === "default" && "border-(--color-border) bg-(--color-surface)",
        tone === "soft" && "border-(--color-border) bg-(--color-panel-soft)",
        tone === "dashed" && "border-dashed border-(--color-border-strong) bg-(--color-panel-soft)",
        elevation === "sm" && "shadow-(--shadow-surface)",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
