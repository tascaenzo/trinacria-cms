import type { ReactNode } from "react";
import { cn } from "../../../utils/class-names.js";
import { Panel } from "../../primitives/panel/panel.js";
import { BodyText } from "../../primitives/text/text.js";
import type { EmptyStateProps, FeedbackBannerProps } from "./feedback.types.js";

export function FeedbackBanner({
  "aria-live": ariaLive,
  className,
  message,
  role,
  title,
  tone = "neutral",
  ...props
}: FeedbackBannerProps) {
  return (
    <Panel
      aria-live={ariaLive ?? (tone === "danger" || tone === "warning" ? "assertive" : "polite")}
      className={cn(
        "rounded-md px-4 py-3 text-sm",
        tone === "neutral" &&
          "border-(--color-neutral-border) bg-(--color-panel-soft) text-(--color-neutral-ink)",
        tone === "info" &&
          "border-(--color-info-border) bg-(--color-info-bg) text-(--color-info-ink)",
        tone === "success" &&
          "border-(--color-success-border) bg-(--color-success-bg) text-(--color-success-ink)",
        tone === "warning" &&
          "border-(--color-warning-border) bg-(--color-warning-bg) text-(--color-warning-ink)",
        tone === "danger" &&
          "border-(--color-danger-border) bg-(--color-danger-bg) text-(--color-danger-ink)",
        className
      )}
      radius="lg"
      role={role ?? (tone === "danger" || tone === "warning" ? "alert" : "status")}
      tone="custom"
      {...props}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={cn(title ? "mt-1 leading-6" : "leading-6")}>{message}</div>
    </Panel>
  );
}

export function ErrorBanner({
  message,
  ...props
}: Omit<FeedbackBannerProps, "tone" | "message"> & { message: ReactNode }) {
  return <FeedbackBanner tone="danger" message={message} {...props} />;
}

export function EmptyState({
  action,
  children,
  className,
  text,
  title,
  ...props
}: EmptyStateProps) {
  return (
    <Panel
      className={cn("grid gap-3 p-5 text-sm text-(--color-ink-muted)", className)}
      tone="dashed"
      {...props}
    >
      {title ? <p className="text-base font-semibold text-(--color-ink)">{title}</p> : null}
      <BodyText className="leading-7">{text}</BodyText>
      {children}
      {action ? <div className="pt-1">{action}</div> : null}
    </Panel>
  );
}
