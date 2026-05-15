import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";

export interface DetailSectionProps extends PropsWithChildren<
  Omit<HTMLAttributes<HTMLDivElement>, "title">
> {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}
