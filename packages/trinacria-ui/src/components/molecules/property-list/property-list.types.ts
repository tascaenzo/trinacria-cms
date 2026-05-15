import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";

export interface PropertyListProps extends PropsWithChildren<HTMLAttributes<HTMLDListElement>> {
  columns?: 1 | 2 | 3;
}

export interface PropertyItemProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
}
