import { useState, type ReactNode } from "react";
import { Button, Input, Select } from "@trinacria-cms/trinacria-ui";
import type {
  ContentWorkflow,
  ContentWorkflowState,
  ContentWorkflowTransition
} from "../editorial-admin.types.js";
import { workflowFromPreset } from "./use-content-type-detail.js";

export function ContentTypeWorkflowEditor({
  workflow,
  disabled,
  onChange
}: {
  workflow: ContentWorkflow;
  disabled: boolean;
  onChange: (workflow: ContentWorkflow) => void;
}) {
  const [newStateLabel, setNewStateLabel] = useState("");
  const [newStateKey, setNewStateKey] = useState("");
  const [newTransitionLabel, setNewTransitionLabel] = useState("");
  const [newTransitionFrom, setNewTransitionFrom] = useState("");
  const [newTransitionTo, setNewTransitionTo] = useState("");

  const markCustom = (next: Omit<ContentWorkflow, "preset">): ContentWorkflow => ({
    preset: "custom",
    ...next
  });
  const addState = () => {
    const key = newStateKey.trim().toLowerCase();
    const label = newStateLabel.trim();
    if (!key || !label || workflow.states.some((state) => state.key === key)) return;
    onChange(
      markCustom({
        states: [...workflow.states, { key, label, initial: false }],
        transitions: workflow.transitions
      })
    );
    setNewStateLabel("");
    setNewStateKey("");
  };
  const removeState = (key: string) => {
    if (workflow.states.length <= 1) return;
    const nextStates = workflow.states.filter((state) => state.key !== key);
    const hasInitial = nextStates.some((state) => state.initial);
    onChange(
      markCustom({
        states: nextStates.map((state, index) => ({
          ...state,
          initial: hasInitial ? state.initial : index === 0
        })),
        transitions: workflow.transitions.filter(
          (transition) => transition.from !== key && transition.to !== key
        )
      })
    );
  };
  const setInitial = (key: string) =>
    onChange(
      markCustom({
        states: workflow.states.map((state) => ({ ...state, initial: state.key === key })),
        transitions: workflow.transitions
      })
    );
  const addTransition = () => {
    const label = newTransitionLabel.trim();
    const from = newTransitionFrom || workflow.states[0]?.key;
    const to = newTransitionTo;
    const key = `${from}_to_${to}`.replace(/[^a-z0-9_]/g, "_");
    if (
      !label ||
      !from ||
      !to ||
      from === to ||
      workflow.transitions.some((item) => item.key === key)
    ) {
      return;
    }
    onChange(
      markCustom({
        states: workflow.states,
        transitions: [...workflow.transitions, { key, label, from, to }]
      })
    );
    setNewTransitionLabel("");
    setNewTransitionFrom("");
    setNewTransitionTo("");
  };
  const removeTransition = (key: string) =>
    onChange(
      markCustom({
        states: workflow.states,
        transitions: workflow.transitions.filter((transition) => transition.key !== key)
      })
    );

  return (
    <div className="grid gap-5">
      <Select
        label="Preset"
        value={workflow.preset}
        disabled={disabled}
        onChange={(event) => {
          const preset = event.currentTarget.value as "review" | "direct" | "custom";
          if (preset === "custom") {
            onChange({ ...workflow, preset });
          } else {
            onChange(workflowFromPreset(preset));
          }
        }}
      >
        <option value="review">Revisione editoriale</option>
        <option value="direct">Pubblicazione diretta</option>
        <option value="custom">Personalizzato</option>
      </Select>

      <WorkflowBlock title="Stati">
        <div className="grid gap-2">
          {workflow.states.map((state) => (
            <WorkflowStateRow
              key={state.key}
              state={state}
              disabled={disabled}
              onInitial={() => setInitial(state.key)}
              onRemove={() => removeState(state.key)}
            />
          ))}
        </div>
        <div className="mt-3 grid gap-3 rounded-lg bg-[color:var(--color-surface-subtle)] p-3">
          <Input
            label="Nome del nuovo stato"
            placeholder="In attesa di conferma"
            value={newStateLabel}
            readOnly={disabled}
            onChange={(event) => setNewStateLabel(event.currentTarget.value)}
          />
          <Input
            label="ID tecnico"
            hint="Es. in_attesa_conferma"
            placeholder="in_attesa_conferma"
            value={newStateKey}
            readOnly={disabled}
            onChange={(event) => setNewStateKey(event.currentTarget.value)}
          />
          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled || !newStateLabel.trim() || !newStateKey.trim()}
              onClick={addState}
            >
              Aggiungi stato
            </Button>
          </div>
        </div>
      </WorkflowBlock>

      <WorkflowBlock title="Passaggi consentiti">
        {workflow.transitions.length ? (
          <div className="grid gap-2">
            {workflow.transitions.map((transition) => (
              <WorkflowTransitionRow
                key={transition.key}
                transition={transition}
                stateByKey={new Map(workflow.states.map((state) => [state.key, state]))}
                disabled={disabled}
                onRemove={() => removeTransition(transition.key)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            Non sono ancora definiti passaggi tra stati.
          </p>
        )}
        <div className="mt-3 grid gap-3 rounded-lg bg-[color:var(--color-surface-subtle)] p-3">
          <Input
            label="Azione"
            placeholder="Invia al responsabile"
            value={newTransitionLabel}
            readOnly={disabled}
            onChange={(event) => setNewTransitionLabel(event.currentTarget.value)}
          />
          <Select
            label="Da stato"
            value={newTransitionFrom}
            disabled={disabled}
            onChange={(event) => setNewTransitionFrom(event.currentTarget.value)}
          >
            <option value="">Scegli stato</option>
            {workflow.states.map((state) => (
              <option key={state.key} value={state.key}>
                {state.label}
              </option>
            ))}
          </Select>
          <Select
            label="A stato"
            value={newTransitionTo}
            disabled={disabled}
            onChange={(event) => setNewTransitionTo(event.currentTarget.value)}
          >
            <option value="">Scegli stato</option>
            {workflow.states.map((state) => (
              <option key={state.key} value={state.key}>
                {state.label}
              </option>
            ))}
          </Select>
          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={
                disabled || !newTransitionLabel.trim() || !newTransitionFrom || !newTransitionTo
              }
              onClick={addTransition}
            >
              Aggiungi passaggio
            </Button>
          </div>
        </div>
      </WorkflowBlock>
    </div>
  );
}

function WorkflowBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-[color:var(--color-ink)]">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function WorkflowStateRow({
  state,
  disabled,
  onInitial,
  onRemove
}: {
  state: ContentWorkflowState;
  disabled: boolean;
  onInitial: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[color:var(--color-surface-subtle)] px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[color:var(--color-ink)]">
          {state.label}
        </span>
        <span className="block font-mono text-xs text-[color:var(--color-ink-subtle)]">
          {state.key}
        </span>
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant={state.initial ? "secondary" : "ghost"}
          size="sm"
          disabled={disabled || state.initial}
          onClick={onInitial}
        >
          {state.initial ? "Iniziale" : "Imposta iniziale"}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onRemove}>
          Rimuovi
        </Button>
      </div>
    </div>
  );
}

function WorkflowTransitionRow({
  transition,
  stateByKey,
  disabled,
  onRemove
}: {
  transition: ContentWorkflowTransition;
  stateByKey: ReadonlyMap<string, ContentWorkflowState>;
  disabled: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[color:var(--color-surface-subtle)] px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[color:var(--color-ink)]">
          {transition.label}
        </span>
        <span className="block text-xs text-[color:var(--color-ink-subtle)]">
          {stateByKey.get(transition.from)?.label ?? transition.from} →{" "}
          {stateByKey.get(transition.to)?.label ?? transition.to}
        </span>
      </span>
      <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onRemove}>
        Rimuovi
      </Button>
    </div>
  );
}
