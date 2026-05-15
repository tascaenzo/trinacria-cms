import { Panel } from "../../primitives/panel/panel.js";
import { cn } from "../../../utils/class-names.js";
import type { FilterBarProps } from "./filter-bar.types.js";

export function FilterBar({ actions, children, className, summary, ...props }: FilterBarProps) {
  return (
    <Panel className={cn("grid gap-4 p-4", className)} tone="soft" radius="lg">
      <form className="grid gap-4 md:grid-cols-[1fr_auto_auto]" {...props}>
        {children}
        {actions ? <div className="contents">{actions}</div> : null}
      </form>
      {summary ? (
        <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">{summary}</p>
      ) : null}
    </Panel>
  );
}
