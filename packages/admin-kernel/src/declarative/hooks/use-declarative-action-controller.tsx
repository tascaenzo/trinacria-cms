import { Button, Dialog, InfoCard, KeyValueItem, KeyValuePanel, Textarea } from "@trinacria-cms/trinacria-ui";
import { useState } from "react";
import { JsonPreviewAction } from "../../components/json-preview-action.js";
import { toDisplayError } from "../../lib/sdk-errors.js";
import { validateAdminEndpointBinding } from "../../runtime/admin-endpoint-policy.js";
import { cms } from "../../runtime/cms-sdk.js";
import type { DeclarativeAction, DeclarativeActionContext, DeclarativeActionState } from "../types.js";
import {
  createDeclarativeActionDraftBody,
  parseActionBody,
  parseDraftBodyPreview,
  resolveDeclarativeActionPathParams
} from "../utils/action-body.js";
import { formatEndpoint } from "../utils/formatting.js";

export function useDeclarativeActionController({ onSuccess }: { onSuccess?: () => void }) {
  const [selectedAction, setSelectedAction] = useState<DeclarativeAction | null>(null);
  const [actionContext, setActionContext] = useState<DeclarativeActionContext | undefined>();
  const [draftBody, setDraftBody] = useState("");
  const [actionState, setActionState] = useState<DeclarativeActionState>({ status: "idle" });

  function prepareAction(action: DeclarativeAction, context?: DeclarativeActionContext) {
    setSelectedAction(action);
    setActionContext(context);
    setDraftBody(createDeclarativeActionDraftBody(action, context));
    setActionState({ status: "idle" });
  }

  async function executeAction() {
    if (!selectedAction) {
      return;
    }

    const policyResult = validateAdminEndpointBinding(selectedAction.endpoint, "action");
    if (!policyResult.ok) {
      setActionState({
        status: "error",
        error: policyResult.reason ?? "Declarative action rejected by admin security policy"
      });
      return;
    }

    let body: unknown;
    try {
      body = parseActionBody(draftBody);
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
    } catch (error) {
      setActionState({ status: "error", error: toDisplayError(error) });
    }
  }

  const previewPathParams = selectedAction
    ? resolveDeclarativeActionPathParams(
        selectedAction.endpoint.path,
        parseDraftBodyPreview(draftBody),
        actionContext?.record
      )
    : undefined;

  return {
    prepareAction,
    dialog: (
      <Dialog
        open={Boolean(selectedAction)}
        onClose={() => setSelectedAction(null)}
        title={selectedAction?.title ?? "Prepare action"}
        description={
          selectedAction?.summary ??
          "Review the endpoint and request body before executing this declarative action."
        }
        width="lg"
        closeLabel="Close"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setSelectedAction(null)}>
              Cancel
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
              {actionState.status === "submitting" ? "Executing..." : "Execute"}
            </Button>
          </>
        }
      >
        {selectedAction ? (
          <div className="grid gap-4">
            <KeyValuePanel>
              <KeyValueItem label="Intent" value={selectedAction.intent} />
              <KeyValueItem label="Endpoint" value={formatEndpoint(selectedAction.endpoint)} />
              {previewPathParams && Object.keys(previewPathParams).length > 0 ? (
                <KeyValueItem label="Path params" value={JSON.stringify(previewPathParams)} />
              ) : null}
            </KeyValuePanel>
            <Textarea
              label="Request body"
              hint="JSON payload generated from the action schema. Empty payloads are sent without body."
              value={draftBody}
              onChange={(event) => {
                setDraftBody(event.target.value);
                setActionState({ status: "idle" });
              }}
              rows={10}
            />
            {actionState.status === "error" ? (
              <InfoCard title="Action failed" description={actionState.error} tone="dashed" />
            ) : null}
            {actionState.status === "success" ? (
              <JsonPreviewAction
                title="Action response"
                payloadTitle="Action response"
                value={actionState.response}
              />
            ) : null}
            {selectedAction.input?.schema ? (
              <JsonPreviewAction
                title="Input schema"
                payloadTitle="Input schema"
                value={selectedAction.input.schema}
              />
            ) : null}
          </div>
        ) : null}
      </Dialog>
    )
  };
}
