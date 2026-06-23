import { Button, Dialog, InfoCard } from "@trinacria-cms/trinacria-ui";
import { useEffect, useState } from "react";
import type { TranslateFn } from "../../lib/i18n.js";
import { toDisplayError } from "../../lib/sdk-errors.js";
import { validateAdminEndpointBinding } from "../../runtime/admin-endpoint-policy.js";
import { cms } from "../../runtime/cms-sdk.js";
import type {
  DeclarativeAction,
  DeclarativeActionContext,
  DeclarativeActionState
} from "../types.js";
import { resolveDeclarativeActionPathParams } from "../utils/action-body.js";
import {
  createActionBodyFromFields,
  createInitialDraftFields,
  DeclarativeActionFormField,
  defaultDraftFieldValue,
  getActionFormFields,
  loadFieldOptions,
  type DeclarativeActionOptionState,
  type DraftFieldValue
} from "../components/declarative-action-form.js";

const defaultTranslate: TranslateFn = (key, fallback) => fallback ?? key;

export function useDeclarativeActionController({
  onSuccess,
  t
}: {
  onSuccess?: () => void;
  t?: TranslateFn;
}) {
  const [selectedAction, setSelectedAction] = useState<DeclarativeAction | null>(null);
  const [actionContext, setActionContext] = useState<DeclarativeActionContext | undefined>();
  const [draftFields, setDraftFields] = useState<Record<string, DraftFieldValue>>({});
  const [optionStates, setOptionStates] = useState<Record<string, DeclarativeActionOptionState>>(
    {}
  );
  const [actionState, setActionState] = useState<DeclarativeActionState>({ status: "idle" });
  const translate = t ?? defaultTranslate;
  const formFields = selectedAction ? getActionFormFields(selectedAction, translate) : [];
  const hasFormFields = formFields.length > 0;

  useEffect(() => {
    if (!selectedAction) {
      setOptionStates({});
      return;
    }

    const fields = getActionFormFields(selectedAction, translate).filter(
      (field) => field.optionSource
    );
    if (fields.length === 0) {
      setOptionStates({});
      return;
    }

    let isCancelled = false;
    setOptionStates(
      Object.fromEntries(
        fields.map((field) => [
          field.key,
          { status: "loading", options: field.options ?? [] } satisfies DeclarativeActionOptionState
        ])
      )
    );

    for (const field of fields) {
      void loadFieldOptions(field).then((state) => {
        if (isCancelled) {
          return;
        }
        setOptionStates((current) => ({
          ...current,
          [field.key]: state
        }));
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [selectedAction, translate]);

  function prepareAction(action: DeclarativeAction, context?: DeclarativeActionContext) {
    setSelectedAction(action);
    setActionContext(context);
    setDraftFields(createInitialDraftFields(action, context));
    setActionState({ status: "idle" });
  }

  function updateDraftField(key: string, value: DraftFieldValue) {
    setDraftFields((current) => ({
      ...current,
      [key]: value
    }));
    setActionState({ status: "idle" });
  }

  async function executeAction() {
    if (!selectedAction) {
      return;
    }

    const policyResult = validateAdminEndpointBinding(
      selectedAction.endpoint,
      "action",
      selectedAction.policy
    );
    if (!policyResult.ok) {
      setActionState({
        status: "error",
        error: policyResult.reason ?? "Declarative action rejected by admin security policy"
      });
      return;
    }

    let body: unknown;
    try {
      body = createActionBodyFromFields(selectedAction, draftFields);
    } catch (error) {
      setActionState({ status: "error", error: toDisplayError(error) });
      return;
    }

    const pathParams = resolveDeclarativeActionPathParams(
      selectedAction.endpoint.path,
      body,
      actionContext?.record
    );
    setActionState({ status: "submitting" });
    try {
      const response = await cms.request({
        method: selectedAction.endpoint.method ?? "POST",
        path: selectedAction.endpoint.path,
        pathParams,
        body
      });
      setActionState({ status: "success", response });
      onSuccess?.();
      setSelectedAction(null);
    } catch (error) {
      setActionState({ status: "error", error: toDisplayError(error) });
    }
  }

  return {
    prepareAction,
    dialog: (
      <Dialog
        open={Boolean(selectedAction)}
        onClose={() => setSelectedAction(null)}
        title={selectedAction?.title ?? "Prepare action"}
        variant="drawer"
        closeVariant="icon"
        closeLabel={translate("common.actions.close", "Close")}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setSelectedAction(null)}>
              {translate("common.actions.cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              className={
                selectedAction?.intent === "delete"
                  ? "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-ink)]"
                  : undefined
              }
              disabled={actionState.status === "submitting"}
              onClick={executeAction}
            >
              {actionState.status === "submitting"
                ? translate("common.actions.working", "Working...")
                : (selectedAction?.title ?? translate("common.actions.save", "Save"))}
            </Button>
          </>
        }
      >
        {selectedAction ? (
          <div className="grid gap-4">
            {hasFormFields ? (
              <div className="grid gap-4">
                {formFields.map((field) => (
                  <DeclarativeActionFormField
                    key={field.key}
                    field={field}
                    onChange={(value) => updateDraftField(field.key, value)}
                    optionState={optionStates[field.key]}
                    value={draftFields[field.key] ?? defaultDraftFieldValue(field)}
                  />
                ))}
              </div>
            ) : (
              <InfoCard
                title="No fields required"
                description="This action does not require additional input."
                className="bg-[color:var(--color-surface)]"
              />
            )}
            {actionState.status === "error" ? (
              <InfoCard title="Action failed" description={actionState.error} tone="dashed" />
            ) : null}
          </div>
        ) : null}
      </Dialog>
    )
  };
}
