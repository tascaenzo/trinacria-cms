import type { HTMLAttributes, PropsWithChildren } from "react";
import { Eyebrow } from "../../primitives/eyebrow/eyebrow.js";
import { Panel } from "../../primitives/panel/panel.js";
import { BodyText } from "../../primitives/text/text.js";
import { cn } from "../../../utils/class-names.js";
import type { CardProps } from "./card.types.js";

/**
 * Card mirrors the dashboard surfaces: light border, moderate radius, and a
 * quiet shadow so data modules stay separated without feeling heavy.
 */
export function Card({ children, className, title, eyebrow, ...props }: CardProps) {
  return (
    <Panel
      className={cn("bg-[color:var(--color-panel)] p-5", className)}
      elevation="sm"
      radius="lg"
      {...props}
    >
      {(eyebrow || title) && (
        <header className="mb-4 space-y-1.5">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          {title ? (
            <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">{title}</h2>
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
    <h3
      className={cn(
        "text-lg font-semibold tracking-[-0.02em] text-[color:var(--color-ink)]",
        className
      )}
      {...props}
    >
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
    <div className={cn("px-6 pb-6 pt-4", className)} {...props}>
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
        "flex items-center justify-end gap-3 border-t border-[color:var(--color-border)] px-6 py-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
