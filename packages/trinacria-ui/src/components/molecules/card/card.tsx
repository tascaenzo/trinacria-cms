import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../../../utils/class-names.js";
import { Icon } from "../../atoms/icon/icon.js";
import { Eyebrow } from "../../primitives/eyebrow/eyebrow.js";
import { Panel } from "../../primitives/panel/panel.js";
import { BodyText } from "../../primitives/text/text.js";
import type { CardHeadingProps, CardProps } from "./card.types.js";

/**
 * Card mirrors the dashboard surfaces: light border, moderate radius, and a
 * quiet shadow so data modules stay separated without feeling heavy.
 */
export function Card({
  children,
  className,
  title,
  eyebrow,
  elevation = "sm",
  headingLevel = 2,
  padding = "md",
  ...props
}: CardProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <Panel
      className={cn(
        "overflow-hidden bg-[color:var(--color-panel)]",
        padding === "md" && "p-5",
        padding === "none" && "p-0",
        className
      )}
      elevation={elevation}
      radius="lg"
      {...props}
    >
      {(eyebrow || title) && (
        <header className="mb-4 space-y-1.5">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          {title ? (
            <Heading className="text-lg font-semibold text-[color:var(--color-ink)]">
              {title}
            </Heading>
          ) : null}
        </header>
      )}
      {children}
    </Panel>
  );
}

export function CardHeader({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        "grid gap-1.5 border-b border-[color:var(--color-border)] px-5 py-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Canonical heading used by operational cards and dashboard widgets. */
export function CardHeading({
  actions,
  className,
  description,
  icon,
  headingLevel = 3,
  title,
  ...props
}: CardHeadingProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <div
      className={cn("flex flex-col justify-between gap-4 sm:flex-row sm:items-center", className)}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon ? (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[color:var(--color-panel-soft)] text-[color:var(--color-accent)]">
            <Icon name={icon} />
          </span>
        ) : null}
        <div className="min-w-0">
          <Heading className="text-base font-semibold text-[color:var(--color-ink)]">
            {title}
          </Heading>
          {description ? (
            <p className="mt-0.5 text-xs leading-5 text-[color:var(--color-ink-muted)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardTitle({
  as: Heading = "h3",
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLHeadingElement>> & {
  as?: "h2" | "h3" | "h4";
}) {
  return (
    <Heading
      className={cn(
        "text-lg font-semibold tracking-[-0.02em] text-[color:var(--color-ink)]",
        className
      )}
      {...props}
    >
      {children}
    </Heading>
  );
}

export function CardDescription({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLParagraphElement>>) {
  return (
    <BodyText className={className} {...props}>
      {children}
    </BodyText>
  );
}

export function CardContent({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={cn("px-5 py-5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardActions({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 border-t border-[color:var(--color-border)] px-5 py-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
