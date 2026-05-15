import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";

export type KeyValuePanelProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export interface KeyValueItemProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
}
