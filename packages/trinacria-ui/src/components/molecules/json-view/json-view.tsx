import { Eyebrow } from "../../primitives/eyebrow/eyebrow.js";
import { cn } from "../../../utils/class-names.js";
import type { JsonViewProps } from "./json-view.types.js";

/**
 * JsonView gives admin operators a compact structured inspection panel for raw
 * payloads, configuration documents, and debug snapshots.
 */
export function JsonView({ className, title, value, ...props }: JsonViewProps) {
  return (
    <section className="grid gap-2">
      {title ? <Eyebrow className="text-xs">{title}</Eyebrow> : null}
      <pre
        className={cn(
          "overflow-x-auto rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-code-surface)] px-4 py-4 text-xs leading-6 text-[color:var(--color-code-ink)]",
          className
        )}
        {...props}
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}
