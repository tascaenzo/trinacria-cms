import type { HTMLAttributes, SelectHTMLAttributes } from "react";
import type { IconName } from "../../atoms/icon/icon.js";
import type { ButtonBaseProps } from "../../primitives/button-base/button-base.types.js";
export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  hiddenUntilFocus?: boolean;
  wrap?: boolean;
}
export interface ToolbarButtonProps extends Omit<ButtonBaseProps, "size" | "iconOnly"> {
  label: string;
  icon?: IconName;
}
export interface ToolbarSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}
