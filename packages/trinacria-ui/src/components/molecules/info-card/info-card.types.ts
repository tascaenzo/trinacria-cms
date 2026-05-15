import type { HTMLAttributes, ReactNode } from "react";

export interface InfoCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  tone?: "default" | "soft" | "dashed";
}
