import { Button, Icon } from "@trinacria-cms/trinacria-ui";
import type { ContentWorkflowState, SavedEditorialView } from "./entries.types.js";

export type EditorialViewMode = "list" | "board";

export function EditorialContentViewsToolbar({
  onApplyView,
  onRemoveView,
  onSaveView,
  onSetMode,
  onSetStatus,
  savedViews,
  statusFilter,
  viewMode,
  workflowStates
}: {
  onApplyView: (view: SavedEditorialView) => void;
  onRemoveView: (id: string) => void;
  onSaveView: () => void;
  onSetMode: (mode: EditorialViewMode) => void;
  onSetStatus: (status: string) => void;
  savedViews: readonly SavedEditorialView[];
  statusFilter: string;
  viewMode: EditorialViewMode;
  workflowStates: readonly Pick<ContentWorkflowState, "key" | "label">[];
}) {
  const statusPresets = [
    { label: "Tutti", value: "all" },
    ...workflowStates.map((state) => ({ label: state.label, value: state.key }))
  ];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap gap-1 rounded-lg bg-[color:var(--color-surface-subtle)] p-1"
          aria-label="Viste preimpostate"
        >
          {statusPresets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                statusFilter === preset.value
                  ? "bg-[color:var(--color-panel)] font-medium text-[color:var(--color-ink)] shadow-[var(--shadow-sm)]"
                  : "text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
              }`}
              onClick={() => onSetStatus(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onSetMode("list")}
          >
            Elenco
          </Button>
          <Button
            type="button"
            variant={viewMode === "board" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onSetMode("board")}
          >
            Board
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onSaveView}>
            <Icon name="bookmark" />
            Salva vista
          </Button>
        </div>
      </div>

      {savedViews.length ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-[color:var(--color-border)] pt-3">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-[color:var(--color-ink-subtle)]">
            Le mie viste
          </span>
          {savedViews.map((view) => (
            <span
              key={view.id}
              className="inline-flex items-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] pl-3 text-sm text-[color:var(--color-ink-muted)]"
            >
              <button type="button" className="py-1.5" onClick={() => onApplyView(view)}>
                {view.name}
              </button>
              <button
                type="button"
                className="px-2 py-1.5 text-[color:var(--color-ink-subtle)] hover:text-[color:var(--color-ink)]"
                aria-label={`Elimina vista ${view.name}`}
                onClick={() => onRemoveView(view.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
