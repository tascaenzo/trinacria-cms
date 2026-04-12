import type { HTMLAttributes, PropsWithChildren } from "react";

export interface ButtonGroupProps extends PropsWithChildren, HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  wrap?: boolean;
}
