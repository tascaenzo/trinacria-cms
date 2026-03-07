/**
 * Shared feedback blocks keep resource pages visually and semantically aligned
 * while the surrounding business logic moves to React 19 action patterns.
 */
export function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {message}
    </p>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <p className="text-sm leading-7 text-[color:var(--color-ink-muted)]">{text}</p>;
}
