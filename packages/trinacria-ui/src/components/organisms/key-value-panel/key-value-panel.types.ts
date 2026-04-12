import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";

export interface KeyValuePanelProps extends PropsWithChildren<HTMLAttributes<HTMLDivElement>> {}

export interface KeyValueItemProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
}
