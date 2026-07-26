import type { ReactNode } from "react";
import { cn } from "../../../utils/class-names.js";
import { Panel } from "../../primitives/panel/panel.js";
import { BodyText } from "../../primitives/text/text.js";
import type { EmptyStateProps, FeedbackBannerProps } from "./feedback.types.js";

export function FeedbackBanner({
  className,
  message,
  title,
  tone = "neutral",
  ...props
}: FeedbackBannerProps) {
  return (
    <Panel
      className={cn(
        "rounded-md px-4 py-3 text-sm",
        tone === "neutral" &&
          "border-[color:var(--color-neutral-border)] bg-[color:var(--color-panel-soft)] text-[color:var(--color-neutral-ink)]",
        tone === "info" &&
          "border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] text-[color:var(--color-info-ink)]",
        tone === "success" &&
          "border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]",
        tone === "warning" &&
          "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-ink)]",
        tone === "danger" &&
          "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-ink)]",
        className
      )}
      radius="lg"
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
      className={cn("grid gap-3 p-5 text-sm text-[color:var(--color-ink-muted)]", className)}
      tone="dashed"
      {...props}
    >
      {title ? (
        <p className="text-base font-semibold text-[color:var(--color-ink)]">{title}</p>
      ) : null}
      <BodyText className="leading-7">{text}</BodyText>
      {children}
      {action ? <div className="pt-1">{action}</div> : null}
    </Panel>
  );
}
