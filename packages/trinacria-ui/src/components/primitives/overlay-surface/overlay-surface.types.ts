import type { HTMLAttributes } from "react";

export type OverlaySurfaceVariant = "popover" | "modal" | "drawer";

export interface OverlaySurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: OverlaySurfaceVariant;
}
