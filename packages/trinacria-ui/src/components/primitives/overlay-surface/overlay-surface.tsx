import { forwardRef } from "react";
import { cn } from "../../../utils/class-names.js";
import type { OverlaySurfaceProps } from "./overlay-surface.types.js";

export const OverlaySurface = forwardRef<HTMLDivElement, OverlaySurfaceProps>(
  function OverlaySurface({ className, variant = "popover", ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-(--color-surface)",
          variant === "popover" &&
            "border border-(--color-border) rounded-(--radius-overlay) shadow-(--shadow-popover)",
          variant === "modal" &&
            "border border-transparent rounded-(--radius-overlay) shadow-(--shadow-overlay)",
          variant === "drawer" && "border-0 shadow-(--shadow-drawer)",
          className
        )}
        {...props}
      />
    );
  }
);
