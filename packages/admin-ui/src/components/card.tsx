import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../utils/class-names.js";

export interface CardProps
  extends PropsWithChildren,
    HTMLAttributes<HTMLDivElement> {
  title?: string;
  eyebrow?: string;
}

/**
 * Card mirrors the dashboard surfaces: light border, moderate radius, and a
 * quiet shadow so data modules stay separated without feeling heavy.
 */
export function Card({
  children,
  className,
  title,
  eyebrow,
  ...props
}: CardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]",
        className,
      )}
      {...props}
    >
      {(eyebrow || title) && (
        <header className="mb-4 space-y-1.5">
          {eyebrow ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--color-ink-subtle)]">
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">{title}</h2>
          ) : null}
        </header>
      )}
      {children}
    </section>
  );
}

export function CardHeader({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={cn("grid gap-1.5 px-6 pt-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLHeadingElement>>) {
  return (
    <h3 className={cn("text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLParagraphElement>>) {
  return (
    <p className={cn("text-sm leading-6 text-[color:var(--color-ink-muted)]", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={cn("px-6 pb-6 pt-4", className)} {...props}>
      {children}
    </div>
  );
}
