import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../../../utils/class-names.js";
import { Eyebrow } from "../../primitives/eyebrow/eyebrow.js";
import { Panel } from "../../primitives/panel/panel.js";
import { BodyText } from "../../primitives/text/text.js";
import type { PageHeaderProps } from "./page-section.types.js";

export function PageHeader({
  actions,
  className,
  description,
  eyebrow,
  title,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-[color:var(--color-border)] pb-4 md:flex-row md:items-center md:justify-between",
        className
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
          {title}
        </h1>
        {description ? <BodyText>{description}</BodyText> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}

export function ActionBar({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <Panel
      className={cn(
        "flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between",
        className
      )}
      tone="soft"
      {...props}
    >
      {children}
    </Panel>
  );
}
