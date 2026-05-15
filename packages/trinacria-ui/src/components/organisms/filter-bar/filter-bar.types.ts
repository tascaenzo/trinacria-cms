import type { FormHTMLAttributes, PropsWithChildren, ReactNode } from "react";

export interface FilterBarProps extends PropsWithChildren<FormHTMLAttributes<HTMLFormElement>> {
  actions?: ReactNode;
  summary?: ReactNode;
}
