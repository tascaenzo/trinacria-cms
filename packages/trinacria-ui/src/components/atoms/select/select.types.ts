import type { PropsWithChildren, SelectHTMLAttributes } from "react";

export interface SelectProps extends PropsWithChildren, SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}
