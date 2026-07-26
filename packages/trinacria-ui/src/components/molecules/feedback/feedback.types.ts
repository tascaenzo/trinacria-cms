import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";

export interface FeedbackBannerProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: ReactNode;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
}

export interface EmptyStateProps
  extends PropsWithChildren<Omit<HTMLAttributes<HTMLDivElement>, "title">> {
  title?: ReactNode;
  text: ReactNode;
  action?: ReactNode;
}
