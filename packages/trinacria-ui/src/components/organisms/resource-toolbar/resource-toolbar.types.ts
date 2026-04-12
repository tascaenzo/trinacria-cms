import type { HTMLAttributes, ReactNode } from "react";

export interface ResourceToolbarProps extends HTMLAttributes<HTMLDivElement> {
  leading?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
}
