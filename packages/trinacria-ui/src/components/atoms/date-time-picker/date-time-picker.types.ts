import type { HTMLAttributes, ReactNode } from "react";

export interface DateTimePickerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  minuteStep?: number;
}
