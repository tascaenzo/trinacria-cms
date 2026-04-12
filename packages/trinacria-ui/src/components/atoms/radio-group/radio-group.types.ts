import type { FieldsetHTMLAttributes, ReactNode } from "react";

export interface RadioOption {
  description?: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  value: string;
}

export interface RadioGroupProps extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, "onChange"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  name: string;
  onValueChange?: (value: string) => void;
  options: RadioOption[];
  orientation?: "vertical" | "horizontal";
  value?: string;
}
