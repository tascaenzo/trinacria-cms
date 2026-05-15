import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import type { IconName } from "../../atoms/icon/icon.js";

export type NotificationTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface NotificationProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  tone?: NotificationTone;
  icon?: IconName | null;
  meta?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
}

export type NotificationStackProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;
