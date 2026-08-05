import type { InputHTMLAttributes, ReactNode } from "react";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  compact?: boolean;
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
}
