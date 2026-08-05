import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export interface ContentSectionProps
  extends PropsWithChildren<Omit<HTMLAttributes<HTMLElement>, "title">> {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  headingLevel?: 2 | 3 | 4;
}
