import { useActionState, useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Dialog, Input, JsonView } from "@trinacria-cms/admin-ui";
import type { GetSettingValueByKeyResponse, ListSettingDefinitionsResponse } from "@trinacria-cms/sdk";
import { ErrorBanner, EmptyState } from "../components/resource-feedback.js";
import { formatDateTime } from "../lib/formatting.js";
import {
  type AsyncActionState,
  createIdleAsyncActionState,
  readOptionalString,
} from "../runtime/action-state.js";
import { cms } from "../runtime/cms-sdk.js";
import { toDisplayError } from "../lib/sdk-errors.js";

type SettingDefinitionRecord = ListSettingDefinitionsResponse["data"][number];
type SettingValueRecord = GetSettingValueByKeyResponse["data"] | null;

/**
 * SettingsPage keeps reads explicit while moving the filter flow to a React 19
 * action-based form instead of manual submit bookkeeping.
 */
export function SettingsPage() {
  const [records, setRecords] = useState<readonly SettingDefinitionRecord[]>([]);
  const [ownerPluginId, setOwnerPluginId] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<SettingDefinitionRecord | null>(null);
  const [valueRecord, setValueRecord] = useState<SettingValueRecord>(null);
  const [error, setError] = useState<string | null>(null);
  const [valueError, setValueError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValueLoading, setIsValueLoading] = useState(false);
  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const refresh = useCallback(async (nextOwnerPluginId = "") => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await cms.settings.listSettingDefinitions({
        query: {
          ownerPluginId: nextOwnerPluginId || undefined,
          limit: 100,
          offset: 0,
        },
      });
      setOwnerPluginId(nextOwnerPluginId);
      setRecords(response.data);
    } catch (currentError) {
      setError(toDisplayError(currentError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh("");
  }, [refresh]);

  const [filterState, submitFilter, isFilterPending] = useActionState(
    async (_previousState: AsyncActionState<string>, formData: FormData) => {
      const nextOwnerPluginId = readOptionalString(formData, "ownerPluginId") ?? "";
      try {
        const response = await cms.settings.listSettingDefinitions({
          query: {
            ownerPluginId: nextOwnerPluginId || undefined,
            limit: 100,
            offset: 0,
          },
        });
        setOwnerPluginId(nextOwnerPluginId);
        setRecords(response.data);
        setError(null);
        return { ok: true, error: null, data: nextOwnerPluginId };
      } catch (currentError) {
        return {
          ok: false,
          error: toDisplayError(currentError),
          data: null,
        };
      }
    },
    createIdleAsyncActionState<string>(),
  );

  async function inspectRecord(record: SettingDefinitionRecord) {
    setSelectedRecord(record);
    setIsInspectOpen(true);
    setIsValueLoading(true);
    setValueError(null);
    try {
      const response = await cms.settings.getSettingValueByKey({ path: { key: record.key } });
      setValueRecord(response.data);
    } catch (currentError) {
      setValueRecord(null);
      setValueError(toDisplayError(currentError));
    } finally {
      setIsValueLoading(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
      <Card eyebrow="Configuration" title="Settings definitions">
        <div className="mb-5 flex flex-col gap-4 border-b border-[color:var(--color-border)] pb-4">
          <form
            key={ownerPluginId}
            className="grid gap-4 md:grid-cols-[1fr_auto_auto]"
            action={submitFilter}
          >
            <Input
              label="Owner plugin filter"
              name="ownerPluginId"
              defaultValue={ownerPluginId}
              hint="Inspect settings by plugin owner."
            />
            <div className="self-end">
              <Button type="submit" variant="secondary" disabled={isFilterPending}>Apply filter</Button>
            </div>
            <div className="self-end">
              <Button type="button" onClick={() => void refresh()}>Refresh</Button>
            </div>
          </form>
          {filterState.error ? <ErrorBanner message={filterState.error} /> : null}
          <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
            This view is intentionally read-oriented. Definition and resolved-value inspection are safe from the backoffice; writes remain guarded by plugin-signed requests.
          </p>
        </div>
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <EmptyState text="Loading setting definitions..." /> : null}
        {!isLoading ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border)] text-left text-[color:var(--color-ink-subtle)]">
                  <th className="px-4 py-3 font-medium">Key</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-[color:var(--color-border)] last:border-b-0">
                    <td className="px-4 py-4">
                      <p className="font-medium text-[color:var(--color-ink)]">{record.key}</p>
                      <p className="mt-1 text-[color:var(--color-ink-muted)]">{record.category ?? "uncategorized"}</p>
                    </td>
                    <td className="px-4 py-4 text-[color:var(--color-ink-muted)]">{record.ownerPluginId}</td>
                    <td className="px-4 py-4">
                      <Badge tone={record.status === "active" ? "success" : "warning"}>{record.status}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Button variant="secondary" onClick={() => inspectRecord(record)}>
                        Inspect JSON
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Card eyebrow="Configuration policy" title="Why settings stay guarded">
        <div className="grid gap-4">
          <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] p-4">
            <p className="text-sm font-medium text-[color:var(--color-ink)]">Plugin ownership is preserved</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
              Settings writes and secret reveals are protected by the plugin-caller signature protocol, so the backoffice does not bypass ownership rules through a generic admin JWT.
            </p>
          </div>
          <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] p-4">
            <p className="text-sm font-medium text-[color:var(--color-ink)]">JSON-first inspection</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
              Operators can still inspect definitions and resolved values, which is usually what matters for debugging configuration drift.
            </p>
          </div>
        </div>
      </Card>

      <Dialog
        open={isInspectOpen}
        title={selectedRecord ? `Inspect ${selectedRecord.key}` : "Inspect setting"}
        description="Raw configuration views help operators understand effective values, defaults, and schema hints without bypassing plugin ownership constraints."
        onClose={() => setIsInspectOpen(false)}
        width="xl"
      >
        {selectedRecord ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={selectedRecord.status === "active" ? "success" : "warning"}>{selectedRecord.status}</Badge>
                <Badge>{selectedRecord.ownerPluginId}</Badge>
              </div>
              <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] p-4 text-sm text-[color:var(--color-ink-muted)]">
                <p><span className="font-medium text-[color:var(--color-ink)]">Category:</span> {selectedRecord.category ?? "uncategorized"}</p>
                <p className="mt-2"><span className="font-medium text-[color:var(--color-ink)]">Updated:</span> {formatDateTime(selectedRecord.updatedAt)}</p>
              </div>
              <JsonView title="Definition JSON" value={selectedRecord} />
            </div>
            <div className="grid gap-4">
              {isValueLoading ? <EmptyState text="Loading resolved value..." /> : null}
              {valueError ? <ErrorBanner message={valueError} /> : null}
              {valueRecord ? (
                <>
                  <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] p-4 text-sm text-[color:var(--color-ink-muted)]">
                    <p><span className="font-medium text-[color:var(--color-ink)]">Source:</span> {valueRecord.source}</p>
                    <p className="mt-2"><span className="font-medium text-[color:var(--color-ink)]">Owner:</span> {valueRecord.ownerPluginId}</p>
                    <p className="mt-2"><span className="font-medium text-[color:var(--color-ink)]">Updated:</span> {formatDateTime(valueRecord.updatedAt)}</p>
                  </div>
                  <JsonView title="Resolved value JSON" value={valueRecord.value} />
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
