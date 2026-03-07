import type { HTMLAttributes } from "react";
import { cn } from "../utils/class-names.js";

export interface JsonViewProps extends HTMLAttributes<HTMLPreElement> {
  title?: string;
  value: unknown;
}

/**
 * JsonView gives admin operators a compact structured inspection panel for raw
 * payloads, configuration documents, and debug snapshots.
 */
export function JsonView({ className, title, value, ...props }: JsonViewProps) {
  return (
    <section className="grid gap-2">
      {title ? (
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[color:var(--color-ink-subtle)]">
          {title}
        </p>
      ) : null}
      <pre
        className={cn(
          "overflow-x-auto rounded-xl border border-[color:var(--color-border)] bg-slate-950 px-4 py-4 text-xs leading-6 text-slate-100",
          className,
        )}
        {...props}
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}
