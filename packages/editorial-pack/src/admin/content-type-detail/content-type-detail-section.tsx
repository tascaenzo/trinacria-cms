import type { ReactNode } from "react";

export function ContentTypeDetailSection({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-5 shadow-[var(--shadow-sm)]">
      <h2 className="text-base font-semibold text-[color:var(--color-ink)]">{title}</h2>
      <p className="mt-1 text-sm leading-5 text-[color:var(--color-ink-muted)]">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}
