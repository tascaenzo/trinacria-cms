import type { HTMLAttributes, ReactNode } from "react";
import type { IconName } from "../../atoms/icon/icon.js";

export type StatCardTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface StatCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  meta?: ReactNode;
  badge?: ReactNode;
  tone?: StatCardTone;
}
