import { forwardRef } from "react";
import { cn } from "../../../utils/class-names.js";
import type { OverlaySurfaceProps } from "./overlay-surface.types.js";

export const OverlaySurface = forwardRef<HTMLDivElement, OverlaySurfaceProps>(
  function OverlaySurface({ className, variant = "popover", ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-[color:var(--color-surface)]",
          variant === "popover" &&
            "border border-[color:var(--color-border)] rounded-[var(--radius-overlay)] shadow-[var(--shadow-popover)]",
          variant === "modal" &&
            "border border-transparent rounded-[var(--radius-overlay)] shadow-[var(--shadow-overlay)]",
          variant === "drawer" && "border-0 shadow-[var(--shadow-drawer)]",
          className
        )}
        {...props}
      />
    );
  }
);
