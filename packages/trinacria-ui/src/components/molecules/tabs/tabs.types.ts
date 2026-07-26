import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";

export interface TabItem {
  value: string;
  label: ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps
  extends PropsWithChildren<Omit<HTMLAttributes<HTMLDivElement>, "onChange">> {
  items: readonly TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel?: string;
  panelClassName?: string;
}
