import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";

export interface ResourcePageProps extends PropsWithChildren<HTMLAttributes<HTMLDivElement>> {
  header?: ReactNode;
  toolbar?: ReactNode;
  feedback?: ReactNode;
  sidebar?: ReactNode;
}
