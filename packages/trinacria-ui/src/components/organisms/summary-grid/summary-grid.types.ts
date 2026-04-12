import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";

export interface SummaryGridProps extends PropsWithChildren<HTMLAttributes<HTMLDivElement>> {}

export interface SummaryCardProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
}
