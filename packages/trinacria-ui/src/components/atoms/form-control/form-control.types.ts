import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";

export interface FormControlShellProps extends PropsWithChildren<HTMLAttributes<HTMLDivElement>> {
  error?: ReactNode;
  hint?: ReactNode;
  label?: ReactNode;
  controlId?: string;
  errorId?: string;
  hintId?: string;
  labelId?: string;
  labelFor?: string;
}

export interface FormControlSurfaceProps extends PropsWithChildren<HTMLAttributes<HTMLDivElement>> {
  disabled?: boolean;
  error?: ReactNode;
}
