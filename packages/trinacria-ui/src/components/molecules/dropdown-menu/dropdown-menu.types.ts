import type { ButtonHTMLAttributes, HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import type { IconName } from "../../atoms/icon/icon.js";

export interface DropdownMenuProps extends HTMLAttributes<HTMLDivElement> {
  trigger: ReactNode;
  align?: "start" | "end";
  side?: "top" | "bottom";
  contentClassName?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface DropdownMenuItemProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "title"
> {
  icon?: IconName;
  title?: ReactNode;
  description?: ReactNode;
  tone?: "neutral" | "danger";
  closeOnSelect?: boolean;
}

export type DropdownMenuLabelProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;
