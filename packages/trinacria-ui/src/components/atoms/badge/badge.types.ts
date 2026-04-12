import type { HTMLAttributes, PropsWithChildren } from "react";

export interface BadgeProps extends PropsWithChildren, HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
}
