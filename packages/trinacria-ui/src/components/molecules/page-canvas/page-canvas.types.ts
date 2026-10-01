import type { HTMLAttributes } from "react";
export interface PageCanvasProps extends HTMLAttributes<HTMLDivElement> {
  width?: "full" | "form" | "document";
}
