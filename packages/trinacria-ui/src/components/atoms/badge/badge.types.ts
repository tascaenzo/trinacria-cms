import type { HTMLAttributes, PropsWithChildren } from "react";

export interface BadgeProps extends PropsWithChildren, HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "accent" | "info" | "success" | "warning" | "danger";
}
