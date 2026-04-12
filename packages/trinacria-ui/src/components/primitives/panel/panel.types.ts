import type { HTMLAttributes, PropsWithChildren } from "react";

export interface PanelProps extends PropsWithChildren<HTMLAttributes<HTMLDivElement>> {
  tone?: "default" | "soft" | "dashed";
  elevation?: "none" | "sm";
  radius?: "lg" | "xl";
}
