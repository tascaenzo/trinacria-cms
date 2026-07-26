import { cn } from "../../../utils/class-names.js";
import { Panel } from "../../primitives/panel/panel.js";
import type { ResourceToolbarProps } from "./resource-toolbar.types.js";

export function ResourceToolbar({
  actions,
  className,
  filters,
  leading,
  ...props
}: ResourceToolbarProps) {
  return (
    <Panel
      className={cn(
        "flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between",
        className
      )}
      tone="soft"
      {...props}
    >
      <div className="min-w-0 flex-1">{leading}</div>
      {filters ? <div className="flex flex-1 flex-wrap items-center gap-3">{filters}</div> : null}
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </Panel>
  );
}
