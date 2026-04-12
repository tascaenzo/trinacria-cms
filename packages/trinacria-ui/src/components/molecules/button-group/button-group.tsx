import { cn } from "../../../utils/class-names.js";
import type { ButtonGroupProps } from "./button-group.types.js";

export function ButtonGroup({
  children,
  className,
  orientation = "horizontal",
  wrap = true,
  ...props
}: ButtonGroupProps) {
  return (
    <div
      role="group"
      className={cn(
        "flex items-center gap-2",
        orientation === "vertical" && "flex-col items-stretch",
        orientation === "horizontal" && wrap && "flex-wrap",
        orientation === "horizontal" && !wrap && "flex-nowrap",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
