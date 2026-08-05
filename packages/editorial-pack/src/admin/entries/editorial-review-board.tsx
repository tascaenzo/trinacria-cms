import { Button, EmptyState, Icon, Panel } from "@trinacria-cms/trinacria-ui";
import { type DragEvent, useState } from "react";
import { EditorialEntriesHeader } from "./editorial-entries-header.js";
import { EditorialEntryActionsMenu } from "./editorial-entry-actions-menu.js";
import {
  type EditorialEntry,
  type EditorialEntryContentType,
  formatEditorialDate,
  getEntryActions,
  getEntryStatusMeta,
  getTransitionToStatus,
  getWorkflowStates,
  type TransitionAction
} from "./entries.types.js";

interface EditorialReviewBoardProps {
  actionEntryId: string | null;
  canCreate: boolean;
  contentTypeById: ReadonlyMap<string, EditorialEntryContentType>;
  contentTypes: readonly EditorialEntryContentType[];
  description: string;
  entries: readonly EditorialEntry[];
  isLoading: boolean;
  locale: string;
  onCreate: () => void;
  onEdit: (entry: EditorialEntry) => void;
  onRefresh: () => void;
  onRevisions: (entry: EditorialEntry) => void;
  onTransition: (entry: EditorialEntry, action: TransitionAction) => void;
  title: string;
}

export function EditorialReviewBoard(props: EditorialReviewBoardProps) {
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const states = getWorkflowStates(props.contentTypes);
  const draggedEntry = props.entries.find((entry) => entry.id === draggedEntryId);

  const transitionFor = (status: string) =>
    draggedEntry
      ? getTransitionToStatus(
          draggedEntry,
          status,
          props.contentTypeById.get(draggedEntry.contentTypeId)
        )
      : null;

  const clearDrag = () => {
    setDraggedEntryId(null);
    setDropTarget(null);
  };

  const dropEntry = (event: DragEvent, status: string) => {
    event.preventDefault();
    const transition = transitionFor(status);
    if (draggedEntry && transition) props.onTransition(draggedEntry, transition);
    clearDrag();
  };

  return (
    <Panel as="section" className="overflow-hidden p-0" elevation="sm">
      <header className="border-b border-[color:var(--color-border)] px-4 py-4">
        <EditorialEntriesHeader
          title={props.title}
          description={props.description}
          canCreate={props.canCreate}
          isLoading={props.isLoading}
          onCreate={props.onCreate}
          onRefresh={props.onRefresh}
        />
      </header>

      <div className="overflow-x-auto bg-[color:var(--color-surface-subtle)] p-4">
        <div className="flex min-w-max items-start gap-4">
          {states.map((state) => {
            const entries = props.entries.filter((entry) => entry.status === state.key);
            const canDrop = Boolean(transitionFor(state.key));
            const isDropTarget = canDrop && dropTarget === state.key;

            return (
              <Panel
                as="section"
                key={state.key}
                tone="custom"
                className={`w-80 shrink-0 bg-[color:var(--color-panel)] transition ${
                  isDropTarget
                    ? "border-[color:var(--color-accent)] ring-2 ring-[color:var(--color-accent-soft)]"
                    : "border-[color:var(--color-border)]"
                }`}
                onDragOver={(event) => {
                  if (!canDrop) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropTarget(state.key);
                }}
                onDragLeave={(event) => {
                  const nextTarget = event.relatedTarget;
                  if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget))
                    return;
                  setDropTarget(null);
                }}
                onDrop={(event) => dropEntry(event, state.key)}
              >
                <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[color:var(--color-accent)]" />
                    <h2 className="text-sm font-semibold text-[color:var(--color-ink)]">
                      {state.label}
                    </h2>
                  </div>
                  <span className="rounded-full bg-[color:var(--color-surface-subtle)] px-2 py-0.5 text-xs font-semibold text-[color:var(--color-ink-muted)]">
                    {entries.length}
                  </span>
                </header>

                <div className="grid min-h-72 content-start gap-3 p-3">
                  {props.isLoading ? (
                    <BoardSkeleton />
                  ) : entries.length ? (
                    entries.map((entry) => (
                      <ReviewCard
                        key={entry.id}
                        entry={entry}
                        contentType={props.contentTypeById.get(entry.contentTypeId)}
                        locale={props.locale}
                        isActing={props.actionEntryId === entry.id}
                        onDragStart={() => setDraggedEntryId(entry.id)}
                        onDragEnd={clearDrag}
                        onEdit={() => props.onEdit(entry)}
                        onRevisions={() => props.onRevisions(entry)}
                        onTransition={props.onTransition}
                      />
                    ))
                  ) : (
                    <EmptyState
                      className="self-start p-4 text-center"
                      text="Nessun contenuto in questa fase"
                    />
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function ReviewCard({
  contentType,
  entry,
  isActing,
  locale,
  onDragEnd,
  onDragStart,
  onEdit,
  onRevisions,
  onTransition
}: {
  contentType?: EditorialEntryContentType;
  entry: EditorialEntry;
  isActing: boolean;
  locale: string;
  onDragEnd: () => void;
  onDragStart: () => void;
  onEdit: () => void;
  onRevisions: () => void;
  onTransition: (entry: EditorialEntry, action: TransitionAction) => void;
}) {
  const status = getEntryStatusMeta(entry.status, contentType);
  const canMove = getEntryActions(entry.status, contentType).length > 0 && !isActing;

  return (
    <Panel
      as="article"
      draggable={canMove}
      className={`p-3 transition hover:border-[color:var(--color-border-strong)] ${
        canMove ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      elevation="sm"
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", entry.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-start justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="h-auto min-w-0 flex-1 justify-start border-0 bg-transparent p-0 text-left shadow-none hover:bg-transparent"
          onClick={onEdit}
        >
          <span className="block truncate text-sm font-semibold text-[color:var(--color-ink)]">
            {entry.title ?? "Senza titolo"}
          </span>
          <span className="mt-1 block truncate text-xs text-[color:var(--color-ink-subtle)]">
            {contentType?.name ?? "Modello rimosso"}
          </span>
        </Button>
        <EditorialEntryActionsMenu
          entry={entry}
          contentType={contentType}
          isActing={isActing}
          onEdit={onEdit}
          onRevisions={onRevisions}
          onTransition={onTransition}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[color:var(--color-border)] pt-3">
        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${status.className}`}>
          {status.label}
        </span>
        <span className="flex items-center gap-1 text-xs text-[color:var(--color-ink-subtle)]">
          {formatEditorialDate(entry.updatedAt, locale)}
          {canMove ? <Icon name="grip-vertical" className="h-3.5 w-3.5" /> : null}
        </span>
      </div>
    </Panel>
  );
}

function BoardSkeleton() {
  return (
    <div className="grid gap-3">
      {[0, 1].map((item) => (
        <Panel
          aria-hidden="true"
          key={item}
          className="h-28 animate-pulse bg-[color:var(--color-surface-subtle)]"
          tone="soft"
        />
      ))}
    </div>
  );
}
