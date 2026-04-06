import type { PropsWithChildren, ReactNode } from "react";

export interface MobileRecordCardProps extends PropsWithChildren {
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
}

export function MobileRecordList({ children }: PropsWithChildren) {
  return <div className="grid gap-3 md:hidden">{children}</div>;
}

export function MobileRecordCard({
  actions,
  badges,
  children,
  subtitle,
  title,
}: MobileRecordCardProps) {
  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[color:var(--color-ink)]">{title}</p>
          {subtitle ? (
            <p className="mt-1 break-words text-sm text-[color:var(--color-ink-muted)]">{subtitle}</p>
          ) : null}
        </div>
        {badges ? <div className="shrink-0">{badges}</div> : null}
      </div>

      <div className="mt-4 grid gap-3">{children}</div>

      {actions ? (
        <div className="mt-4 border-t border-[color:var(--color-border)] pt-3">{actions}</div>
      ) : null}
    </div>
  );
}

export interface MobileRecordFieldProps {
  label: ReactNode;
  value: ReactNode;
}

export function MobileRecordField({ label, value }: MobileRecordFieldProps) {
  return (
    <div className="grid gap-1">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
        {label}
      </p>
      <div className="text-sm text-[color:var(--color-ink-muted)]">{value}</div>
    </div>
  );
}
