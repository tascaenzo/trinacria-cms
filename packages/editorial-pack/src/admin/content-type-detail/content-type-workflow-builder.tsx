import {
  Button,
  Dialog,
  Icon,
  IconButton,
  Input,
  Panel,
  SelectableCard
} from "@trinacria-cms/trinacria-ui";
import { useState } from "react";
import type { ContentWorkflow, ContentWorkflowState } from "../editorial-admin.types.js";

const STATE_LIBRARY = [
  { key: "draft", label: "Bozza" },
  { key: "in_review", label: "In revisione" },
  { key: "approved", label: "Approvato" },
  { key: "published", label: "Pubblicato" }
] as const;

type DragSource =
  | { kind: "library"; state: ContentWorkflowState }
  | { kind: "canvas"; stateKey: string };

export function createCustomWorkflowDraft(workflow: ContentWorkflow): ContentWorkflow {
  return {
    preset: "custom",
    name:
      workflow.preset === "custom"
        ? (workflow.name ?? "Workflow personalizzato")
        : "Workflow personalizzato",
    states: workflow.states.map((state) => ({ ...state })),
    transitions: workflow.transitions.map((transition) => ({ ...transition }))
  };
}

export function WorkflowBuilderDialog({
  disabled,
  draft,
  onChange,
  onClose,
  onCreate,
  open
}: {
  disabled: boolean;
  draft: ContentWorkflow | null;
  onChange: (workflow: ContentWorkflow | null) => void;
  onClose: () => void;
  onCreate: (workflow: ContentWorkflow) => void;
  open: boolean;
}) {
  if (!draft) return null;
  const canCreate = Boolean(draft.name?.trim()) && draft.states.length > 0;

  return (
    <Dialog
      open={open}
      title="Crea workflow personalizzato"
      description="Trascina gli stati nella lavagna: i passaggi tra le fasi vengono creati automaticamente."
      width="fullscreen"
      closeVariant="icon"
      closeLabel="Annulla creazione workflow"
      onClose={onClose}
      footer={
        <Button
          type="button"
          disabled={disabled || !canCreate}
          onClick={() => onCreate({ ...draft, name: draft.name!.trim() })}
        >
          Crea workflow
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <WorkflowCanvas draft={draft} disabled={disabled} onChange={onChange} />
      </div>
    </Dialog>
  );
}

function WorkflowCanvas({
  disabled,
  draft,
  onChange
}: {
  disabled: boolean;
  draft: ContentWorkflow;
  onChange: (workflow: ContentWorkflow) => void;
}) {
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [newStateLabel, setNewStateLabel] = useState("");
  const applyStates = (states: readonly ContentWorkflowState[]) =>
    onChange(pipelineWorkflow(draft, states));

  const insertAt = (source: DragSource, targetKey?: string) => {
    const targetIndex = targetKey
      ? draft.states.findIndex((state) => state.key === targetKey)
      : draft.states.length;

    if (source.kind === "library") {
      if (draft.states.some((state) => state.key === source.state.key)) return;
      const states = [...draft.states];
      states.splice(Math.max(0, targetIndex), 0, { ...source.state, initial: false });
      applyStates(states);
      return;
    }

    const sourceIndex = draft.states.findIndex((state) => state.key === source.stateKey);
    if (sourceIndex < 0 || sourceIndex === targetIndex) return;
    const states = [...draft.states];
    const [moved] = states.splice(sourceIndex, 1);
    const destination = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    states.splice(Math.max(0, destination), 0, moved!);
    applyStates(states);
  };

  const addCustomState = () => {
    const label = newStateLabel.trim();
    if (!label) return;
    applyStates([
      ...draft.states,
      { key: uniqueStateKey(label, draft.states), label, initial: false }
    ]);
    setNewStateLabel("");
  };

  const removeState = (key: string) => {
    if (draft.states.length > 1) {
      applyStates(draft.states.filter((state) => state.key !== key));
    }
  };

  return (
    <section className="grid gap-6">
      <div>
        <h3 className="text-base font-semibold text-[color:var(--color-ink)]">
          Disegna il percorso
        </h3>
        <p className="mt-2 text-sm text-[color:var(--color-ink-muted)]">
          Trascina una fase nell’area di lavoro o sposta una carta per cambiarne l’ordine.
        </p>
        <div className="mt-5">
          <Input
            label="Nome workflow"
            value={draft.name ?? ""}
            readOnly={disabled}
            onChange={(event) => onChange({ ...draft, name: event.currentTarget.value })}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <WorkflowStateLibrary
          disabled={disabled}
          states={draft.states}
          newStateLabel={newStateLabel}
          onAddCustomState={addCustomState}
          onDragEnd={() => setDragSource(null)}
          onDragStart={(state) => setDragSource({ kind: "library", state })}
          onNewStateLabelChange={setNewStateLabel}
        />
        <WorkflowBoard
          disabled={disabled}
          dragSource={dragSource}
          states={draft.states}
          onDragEnd={() => setDragSource(null)}
          onDragStart={(stateKey) => setDragSource({ kind: "canvas", stateKey })}
          onDrop={(targetKey) => {
            if (dragSource) insertAt(dragSource, targetKey);
            setDragSource(null);
          }}
          onRemove={removeState}
        />
      </div>
    </section>
  );
}

function WorkflowStateLibrary({
  disabled,
  newStateLabel,
  onAddCustomState,
  onDragEnd,
  onDragStart,
  onNewStateLabelChange,
  states
}: {
  disabled: boolean;
  newStateLabel: string;
  onAddCustomState: () => void;
  onDragEnd: () => void;
  onDragStart: (state: ContentWorkflowState) => void;
  onNewStateLabelChange: (value: string) => void;
  states: readonly ContentWorkflowState[];
}) {
  return (
    <Panel as="aside" className="p-4" tone="soft">
      <h4 className="text-sm font-semibold text-[color:var(--color-ink)]">Fasi disponibili</h4>
      <p className="mt-1 text-xs leading-5 text-[color:var(--color-ink-muted)]">
        Trascina una fase nel flusso.
      </p>
      <div className="mt-4 grid gap-2">
        {STATE_LIBRARY.map((state) => {
          const isAdded = states.some((item) => item.key === state.key);
          return (
            <SelectableCard
              key={state.key}
              padding="sm"
              draggable={!disabled && !isAdded}
              disabled={disabled || isAdded}
              onDragStart={() => onDragStart({ ...state, initial: false })}
              onDragEnd={onDragEnd}
              className="flex items-center justify-between text-sm font-medium"
            >
              {state.label}
              <Icon name="grip-vertical" className="text-[color:var(--color-ink-subtle)]" />
            </SelectableCard>
          );
        })}
      </div>

      <div className="mt-5 border-t border-[color:var(--color-border)] pt-4">
        <p className="text-xs font-semibold text-[color:var(--color-ink)]">Fase personalizzata</p>
        <div className="mt-3 grid gap-3">
          <Input
            aria-label="Nome della fase"
            value={newStateLabel}
            readOnly={disabled}
            onChange={(event) => onNewStateLabelChange(event.currentTarget.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled || !newStateLabel.trim()}
            onClick={onAddCustomState}
          >
            Aggiungi fase
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function WorkflowBoard({
  disabled,
  dragSource,
  onDragEnd,
  onDragStart,
  onDrop,
  onRemove,
  states
}: {
  disabled: boolean;
  dragSource: DragSource | null;
  onDragEnd: () => void;
  onDragStart: (stateKey: string) => void;
  onDrop: (targetKey?: string) => void;
  onRemove: (key: string) => void;
  states: readonly ContentWorkflowState[];
}) {
  return (
    <Panel
      className="min-h-72 overflow-x-auto border-2 p-5"
      tone="dashed"
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDrop()}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-[color:var(--color-ink)]">Il tuo workflow</h4>
          <p className="mt-1 text-xs text-[color:var(--color-ink-muted)]">
            Le frecce rappresentano i passaggi creati automaticamente.
          </p>
        </div>
        <span className="rounded-full bg-[color:var(--color-panel)] px-3 py-1 text-xs font-medium text-[color:var(--color-ink-muted)]">
          {states.length} fasi
        </span>
      </div>

      {states.length ? (
        <div className="flex min-h-44 min-w-max items-center">
          {states.map((state, index) => (
            <div key={state.key} className="flex items-center">
              <WorkflowStateCard
                disabled={disabled}
                index={index}
                isDragging={dragSource?.kind === "canvas" && dragSource.stateKey === state.key}
                state={state}
                statesCount={states.length}
                onDragEnd={onDragEnd}
                onDragStart={onDragStart}
                onDrop={onDrop}
                onRemove={onRemove}
              />
              {index < states.length - 1 ? <WorkflowConnector /> : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid min-h-44 place-items-center rounded-lg bg-[color:var(--color-panel)] p-6 text-center text-sm text-[color:var(--color-ink-muted)]">
          Trascina qui la prima fase del workflow.
        </div>
      )}
    </Panel>
  );
}

function WorkflowStateCard({
  disabled,
  index,
  isDragging,
  onDragEnd,
  onDragStart,
  onDrop,
  onRemove,
  state,
  statesCount
}: {
  disabled: boolean;
  index: number;
  isDragging: boolean;
  onDragEnd: () => void;
  onDragStart: (stateKey: string) => void;
  onDrop: (targetKey: string) => void;
  onRemove: (key: string) => void;
  state: ContentWorkflowState;
  statesCount: number;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        draggable={!disabled}
        onDragStart={() => onDragStart(state.key)}
        onDragEnd={onDragEnd}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.stopPropagation();
          onDrop(state.key);
        }}
        className={`w-48 rounded-xl border p-4 text-left shadow-[var(--shadow-sm)] transition ${
          isDragging ? "scale-[0.98] opacity-55" : ""
        } ${
          state.initial
            ? "border-[color:var(--color-accent-border)] bg-[color:var(--color-accent-soft)]"
            : "border-[color:var(--color-border)] bg-[color:var(--color-panel)]"
        }`}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[color:var(--color-surface)] text-xs font-semibold text-[color:var(--color-ink-subtle)]">
          {index + 1}
        </span>
        <span className="mt-4 block text-sm font-semibold text-[color:var(--color-ink)]">
          {state.label}
        </span>
        <span className="mt-2 block text-xs text-[color:var(--color-ink-muted)]">
          {state.initial ? "Punto di partenza" : "Fase del flusso"}
        </span>
        <span className="mt-2 flex items-center gap-1 text-xs font-medium text-[color:var(--color-ink-subtle)]">
          <Icon name="grip-vertical" className="h-3.5 w-3.5" />
          Trascina per riordinare
        </span>
      </button>
      <IconButton
        icon="x"
        disabled={disabled || statesCount <= 1}
        onClick={() => onRemove(state.key)}
        className="absolute right-2 top-2 bg-[color:var(--color-surface)]"
        label={`Rimuovi ${state.label}`}
        size="sm"
        title="Rimuovi fase"
      />
    </div>
  );
}

export function WorkflowConnector() {
  return (
    <div className="flex w-20 shrink-0 items-center justify-center" aria-hidden="true">
      <span className="h-px flex-1 bg-[color:var(--color-border-strong)]" />
      <Icon name="arrow-right" className="mx-1 text-[color:var(--color-ink-subtle)]" />
      <span className="h-px flex-1 bg-[color:var(--color-border-strong)]" />
    </div>
  );
}

function pipelineWorkflow(
  workflow: ContentWorkflow,
  states: readonly ContentWorkflowState[]
): ContentWorkflow {
  const normalizedStates = states.map((state, index) => ({ ...state, initial: index === 0 }));
  return {
    ...workflow,
    preset: "custom",
    states: normalizedStates,
    transitions: normalizedStates.slice(0, -1).map((state, index) => {
      const target = normalizedStates[index + 1]!;
      return (
        workflow.transitions.find(
          (transition) => transition.from === state.key && transition.to === target.key
        ) ?? {
          key: `${state.key}_to_${target.key}`,
          label: `Passa a ${target.label}`,
          from: state.key,
          to: target.key,
          requiredPermission: "submit" as const
        }
      );
    })
  };
}

function uniqueStateKey(label: string, states: readonly ContentWorkflowState[]) {
  const base =
    label
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "fase";
  let candidate = base;
  let suffix = 2;
  while (states.some((state) => state.key === candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  return candidate;
}
