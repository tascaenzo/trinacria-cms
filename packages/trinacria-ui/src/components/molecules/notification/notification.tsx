import { cn } from "../../../utils/class-names.js";
import { Icon, type IconName } from "../../atoms/icon/icon.js";
import { IconButton } from "../../atoms/icon-button/icon-button.js";
import { Panel } from "../../primitives/panel/panel.js";
import { BodyText } from "../../primitives/text/text.js";
import type {
  NotificationProps,
  NotificationStackProps,
  NotificationTone
} from "./notification.types.js";

const NOTIFICATION_ICON_BY_TONE: Record<NotificationTone, IconName> = {
  neutral: "bell",
  info: "circle-alert",
  success: "circle-check-big",
  warning: "triangle-alert",
  danger: "x-circle"
};

export function Notification({
  action,
  "aria-live": ariaLive,
  className,
  description,
  dismissLabel = "Chiudi notifica",
  icon,
  meta,
  onDismiss,
  role,
  title,
  tone = "neutral",
  ...props
}: NotificationProps) {
  const resolvedIcon = icon === null ? null : (icon ?? NOTIFICATION_ICON_BY_TONE[tone]);
  const resolvedRole = role ?? (tone === "danger" || tone === "warning" ? "alert" : "status");
  const resolvedAriaLive = ariaLive ?? (resolvedRole === "alert" ? "assertive" : "polite");

  return (
    <Panel
      aria-live={resolvedAriaLive}
      className={cn(
        "rounded-md px-4 py-3 shadow-[var(--shadow-notification)]",
        tone === "neutral" &&
          "border-[color:var(--color-neutral-border)] bg-[color:var(--color-notification-neutral-bg)] text-[color:var(--color-neutral-ink)]",
        tone === "info" &&
          "border-[color:var(--color-info-border)] bg-[color:var(--color-notification-info-bg)] text-[color:var(--color-info-ink)]",
        tone === "success" &&
          "border-[color:var(--color-success-border)] bg-[color:var(--color-notification-success-bg)] text-[color:var(--color-success-ink)]",
        tone === "warning" &&
          "border-[color:var(--color-warning-border)] bg-[color:var(--color-notification-warning-bg)] text-[color:var(--color-warning-ink)]",
        tone === "danger" &&
          "border-[color:var(--color-danger-border)] bg-[color:var(--color-notification-danger-bg)] text-[color:var(--color-danger-ink)]",
        className
      )}
      radius="lg"
      role={resolvedRole}
      tone="custom"
      {...props}
    >
      <div className="flex items-start gap-3">
        {resolvedIcon ? <Icon name={resolvedIcon} className="mt-1 h-5 w-5 shrink-0" /> : null}
        <div className="min-w-0 flex-1">
          {(title || meta) && (
            <div className="flex flex-wrap items-start justify-between gap-2">
              {title ? <p className="text-sm font-semibold leading-6">{title}</p> : null}
              {meta ? (
                <span className="text-xs font-medium uppercase tracking-[0.14em] opacity-80">
                  {meta}
                </span>
              ) : null}
            </div>
          )}
          {description ? (
            <BodyText className={cn("leading-6", title || meta ? "mt-1" : undefined)}>
              {description}
            </BodyText>
          ) : null}
          {action ? (
            <div className={cn("pt-3", !description && !(title || meta) ? "pt-0" : undefined)}>
              {action}
            </div>
          ) : null}
        </div>
        {onDismiss ? (
          <IconButton
            icon="x"
            label={dismissLabel}
            variant="ghost"
            size="sm"
            className="-mr-1 -mt-1 shrink-0"
            onClick={onDismiss}
          />
        ) : null}
      </div>
    </Panel>
  );
}

export function NotificationStack({ children, className, ...props }: NotificationStackProps) {
  return (
    <div className={cn("grid gap-3", className)} {...props}>
      {children}
    </div>
  );
}
