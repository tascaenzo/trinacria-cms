import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { Eyebrow } from "../../primitives/eyebrow/eyebrow.js";
import { Panel } from "../../primitives/panel/panel.js";
import { BodyText } from "../../primitives/text/text.js";
import { cn } from "../../../utils/class-names.js";
import type { MobileRecordCardProps, MobileRecordFieldProps } from "./mobile-record.types.js";

export function MobileRecordList({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={cn("grid gap-3 md:hidden", className)} {...props}>
      {children}
    </div>
  );
}

export function MobileRecordCard({
  actions,
  badges,
  children,
  className,
  subtitle,
  title,
}: MobileRecordCardProps) {
  return (
    <Panel className={cn("p-4", className)} elevation="sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[color:var(--color-ink)]">{title}</p>
          {subtitle ? <BodyText className="mt-1 break-words">{subtitle}</BodyText> : null}
        </div>
        {badges ? <div className="shrink-0">{badges}</div> : null}
      </div>

      <div className="mt-4 grid gap-3">{children}</div>

      {actions ? (
        <div className="mt-4 border-t border-[color:var(--color-border)] pt-3">{actions}</div>
      ) : null}
    </Panel>
  );
}

export function MobileRecordField({
  className,
  label,
  value,
  ...props
}: MobileRecordFieldProps) {
  return (
    <div className={cn("grid gap-1", className)} {...props}>
      <Eyebrow className="tracking-[0.14em]">{label}</Eyebrow>
      <BodyText>{value}</BodyText>
    </div>
  );
}
