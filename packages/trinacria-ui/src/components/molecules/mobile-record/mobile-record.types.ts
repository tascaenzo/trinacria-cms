import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";

export interface MobileRecordCardProps extends PropsWithChildren {
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export interface MobileRecordFieldProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
}
