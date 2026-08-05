import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

export interface SelectableCardProps
  extends PropsWithChildren,
    ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  padding?: "sm" | "md";
}
