import { forwardRef } from "react";
import { cn } from "../../../utils/class-names.js";
import type { OverlaySurfaceProps } from "./overlay-surface.types.js";

export const OverlaySurface = forwardRef<HTMLDivElement, OverlaySurfaceProps>(
  function OverlaySurface({ className, variant = "popover", ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "border border-[color:var(--color-border)] bg-[color:var(--color-surface)]",
          variant === "popover" && "rounded-[var(--radius-overlay)] shadow-[var(--shadow-popover)]",
          variant === "modal" && "rounded-[var(--radius-overlay)] shadow-[var(--shadow-overlay)]",
          variant === "drawer" && "shadow-[var(--shadow-drawer)]",
          className
        )}
        {...props}
      />
    );
  }
);
