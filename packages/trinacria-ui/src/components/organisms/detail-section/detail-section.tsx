import { Eyebrow } from "../../primitives/eyebrow/eyebrow.js";
import { Panel } from "../../primitives/panel/panel.js";
import { BodyText } from "../../primitives/text/text.js";
import { cn } from "../../../utils/class-names.js";
import type { DetailSectionProps } from "./detail-section.types.js";

export function DetailSection({
  actions,
  children,
  className,
  description,
  eyebrow,
  title,
  ...props
}: DetailSectionProps) {
  return (
    <Panel className={cn("grid gap-4 p-5", className)} radius="lg" {...props}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">{title}</h2>
          {description ? <BodyText>{description}</BodyText> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </Panel>
  );
}
