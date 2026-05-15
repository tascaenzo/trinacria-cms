import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";

export type SummaryGridProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export interface SummaryCardProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
}
