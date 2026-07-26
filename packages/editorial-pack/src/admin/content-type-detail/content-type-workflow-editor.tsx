import { Button, Select } from "@trinacria-cms/trinacria-ui";
import { useState } from "react";
import type { ContentWorkflow } from "../editorial-admin.types.js";
import {
  createCustomWorkflowDraft,
  WorkflowBuilderDialog,
  WorkflowConnector
} from "./content-type-workflow-builder.js";
import { workflowFromPreset } from "./content-workflow-presets.js";

type WorkflowPreset = ContentWorkflow["preset"];

export function ContentTypeWorkflowEditor({
  disabled,
  onChange,
  workflow
}: {
  disabled: boolean;
  onChange: (workflow: ContentWorkflow) => void;
  workflow: ContentWorkflow;
}) {
  const [draft, setDraft] = useState<ContentWorkflow | null>(null);

  const openBuilder = () => setDraft(createCustomWorkflowDraft(workflow));
  const closeBuilder = () => setDraft(null);
  const selectPreset = (preset: WorkflowPreset) => {
    if (preset === "custom") openBuilder();
    else onChange(workflowFromPreset(preset));
  };

  return (
    <div className="grid gap-5">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--color-ink)]">
            Workflow operativo
          </h3>
          <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
            Scegli un modello predefinito o disegna un percorso su misura per la redazione.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Modello"
            value={workflow.preset}
            disabled={disabled}
            onChange={(event) => selectPreset(event.currentTarget.value as WorkflowPreset)}
          >
            <option value="review">Revisione editoriale</option>
            <option value="direct">Pubblicazione diretta</option>
            <option value="custom">Personalizzato…</option>
          </Select>
          {workflow.preset === "custom" ? (
            <Button type="button" variant="secondary" disabled={disabled} onClick={openBuilder}>
              Modifica workflow
            </Button>
          ) : null}
        </div>
      </section>

      {workflow.preset === "custom" ? (
        <p className="-mt-2 text-sm text-[color:var(--color-ink-muted)]">
          Workflow personalizzato:{" "}
          <span className="font-medium text-[color:var(--color-ink)]">{workflow.name}</span>
        </p>
      ) : null}

      <WorkflowPreview workflow={workflow} />

      <WorkflowBuilderDialog
        open={draft !== null}
        draft={draft}
        disabled={disabled}
        onClose={closeBuilder}
        onChange={setDraft}
        onCreate={(nextWorkflow) => {
          onChange(nextWorkflow);
          closeBuilder();
        }}
      />
    </div>
  );
}

function WorkflowPreview({ workflow }: { workflow: ContentWorkflow }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)]">
      <div className="overflow-x-auto p-4 sm:p-5">
        <div className="flex min-h-32 min-w-max items-center">
          {workflow.states.map((state, index) => (
            <div key={state.key} className="flex items-center">
              <div
                className={`w-40 rounded-xl border p-4 shadow-[var(--shadow-sm)] ${
                  state.initial
                    ? "border-[color:var(--color-accent-border)] bg-[color:var(--color-accent-soft)]"
                    : "border-[color:var(--color-border)] bg-[color:var(--color-panel)]"
                }`}
              >
                <span className="text-sm font-semibold text-[color:var(--color-ink)]">
                  {state.label}
                </span>
                <span className="mt-2 block text-xs text-[color:var(--color-ink-muted)]">
                  {state.initial ? "Punto di partenza" : "Fase del flusso"}
                </span>
              </div>
              {index < workflow.states.length - 1 ? <WorkflowConnector /> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
