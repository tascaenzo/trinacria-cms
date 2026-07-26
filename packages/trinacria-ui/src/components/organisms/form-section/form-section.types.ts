import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";

export interface FormSectionProps
  extends PropsWithChildren<Omit<HTMLAttributes<HTMLDivElement>, "title">> {
  title: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  actions?: ReactNode;
}
