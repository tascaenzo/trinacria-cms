import type { HTMLAttributes, ReactNode } from "react";

export interface StateStackProps extends HTMLAttributes<HTMLDivElement> {
  loading?: ReactNode;
  error?: ReactNode;
  empty?: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
}
