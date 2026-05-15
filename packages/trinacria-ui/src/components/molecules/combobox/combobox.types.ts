import type { HTMLAttributes, ReactNode } from "react";
import type { IconName } from "../../atoms/icon/icon.js";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: ReactNode;
  meta?: ReactNode;
  keywords?: string[];
  icon?: IconName;
  disabled?: boolean;
}

export interface ComboboxProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: ComboboxOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  label?: string;
  hint?: string;
  error?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  allowClear?: boolean;
}
