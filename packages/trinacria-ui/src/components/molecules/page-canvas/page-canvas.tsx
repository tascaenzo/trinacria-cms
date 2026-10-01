import { cn } from "../../../utils/class-names.js";
import type { PageCanvasProps } from "./page-canvas.types.js";

/** Page spacing belongs to the library; domain code only chooses content width. */
export function PageCanvas({ width = "full", className, ...props }: PageCanvasProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 py-6 sm:px-8",
        width === "form" && "max-w-6xl",
        width === "document" && "max-w-3xl",
        className
      )}
      {...props}
    />
  );
}
