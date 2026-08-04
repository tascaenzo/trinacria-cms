import type { HTMLAttributes, PropsWithChildren } from "react";

export interface PanelProps extends PropsWithChildren<HTMLAttributes<HTMLElement>> {
  as?: "article" | "aside" | "div" | "pre" | "section";
  tone?: "default" | "soft" | "dashed" | "custom";
  elevation?: "none" | "sm";
  radius?: "lg" | "xl";
}
