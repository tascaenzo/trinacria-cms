import { Button, Icon } from "@trinacria-cms/trinacria-ui";
import type { EditorialContentType } from "../editorial-admin.types.js";

export interface ContentTypeCardProps {
  contentType: EditorialContentType;
  onConfigure: () => void;
  onCreateContent: () => void;
  onToggleStatus: () => void;
}

export function ContentTypeCard({
  contentType,
  onConfigure,
  onCreateContent,
  onToggleStatus
}: ContentTypeCardProps) {
  const isActive = contentType.status === "active";
  return (
    <article className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)] text-[color:var(--color-ink-muted)]">
            <Icon name={contentType.icon ?? "file-text"} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-[color:var(--color-ink)]">
              {contentType.name}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-[color:var(--color-ink-subtle)]">
              {contentType.key}
            </p>
          </div>
        </div>
        <span
          className={
            isActive
              ? "rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-700"
              : "rounded-full bg-slate-500/10 px-2 py-1 text-[11px] font-medium text-slate-600"
          }
        >
          {isActive ? "Attivo" : "Archiviato"}
        </span>
      </div>
      <p className="mt-4 min-h-10 text-sm leading-5 text-[color:var(--color-ink-muted)]">
        {contentType.description ?? "Nessuna descrizione configurata."}
      </p>
      <dl className="mt-5 grid grid-cols-2 border-y border-[color:var(--color-border)] py-3">
        <Metric label="Campi" value={String(contentType.fields.length)} />
        <Metric
          label="Scelte"
          value={String(contentType.fields.filter((field) => field.type === "select").length)}
        />
      </dl>
      <footer className="mt-4 flex flex-wrap justify-between gap-2">
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onConfigure}>
            Configura
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onToggleStatus}>
            {isActive ? "Archivia" : "Riattiva"}
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!isActive}
          onClick={onCreateContent}
        >
          Crea contenuto
          <Icon name="arrow-right" />
        </Button>
      </footer>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-[color:var(--color-ink-subtle)]">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-[color:var(--color-ink)]">
        {value}
      </dd>
    </div>
  );
}
