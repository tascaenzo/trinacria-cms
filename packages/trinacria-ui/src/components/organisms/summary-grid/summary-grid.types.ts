import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";

export type SummaryGridProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

/** @deprecated Prefer StatCard for new metric summaries. */
export interface SummaryCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
}
