import type { HTMLAttributes } from "react";
import type { IconName } from "../icon/icon.js";
export interface IconTileProps extends HTMLAttributes<HTMLSpanElement> {
  icon: IconName;
  tone?: "neutral" | "accent" | "info" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  label?: string;
}
