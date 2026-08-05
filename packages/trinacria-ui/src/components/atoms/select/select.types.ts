import type { PropsWithChildren, ReactNode, SelectHTMLAttributes } from "react";

export interface SelectProps extends PropsWithChildren, SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  containerClassName?: string;
}
