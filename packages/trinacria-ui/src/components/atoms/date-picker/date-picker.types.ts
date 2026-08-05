import type { HTMLAttributes, ReactNode } from "react";

export interface DatePickerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  min?: string;
  max?: string;
  name?: string;
  clearLabel?: string;
  clearText?: string;
  previousMonthLabel?: string;
  nextMonthLabel?: string;
  locale?: string;
  weekdayLabels?: readonly string[];
}
