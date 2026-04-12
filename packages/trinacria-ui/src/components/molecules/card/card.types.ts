import type { HTMLAttributes, PropsWithChildren } from "react";

export interface CardProps extends PropsWithChildren, HTMLAttributes<HTMLDivElement> {
  title?: string;
  eyebrow?: string;
}
