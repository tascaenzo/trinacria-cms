import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Dialog, Input, JsonView, Select, Textarea } from "@trinacria-cms/admin-ui";
import type { CreateApiKeyResponse, ListApiKeysResponse } from "@trinacria-cms/sdk";
import { ErrorBanner, EmptyState } from "../components/resource-feedback.js";
import { useOptimisticStatusRecords } from "../hooks/use-optimistic-status-records.js";
import { formatDateTime, parseCommaSeparatedList } from "../lib/formatting.js";
import {
  type AsyncActionState,
  createIdleAsyncActionState,
  readOptionalString,
  readRequiredString,
} from "../runtime/action-state.js";
import { cms } from "../runtime/cms-sdk.js";
import { toDisplayError } from "../lib/sdk-errors.js";

type ApiKeyRecord = ListApiKeysResponse["data"][number];
type IssuedApiKey = CreateApiKeyResponse["data"];

export function ApiKeysPage() {
  const [records, setRecords] = useState<readonly ApiKeyRecord[]>([]);
  const [latestIssuedKey, setLatestIssuedKey] = useState<IssuedApiKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const createFormRef = useRef<HTMLFormElement>(null);
  const [optimisticRecords, applyOptimisticStatus] = useOptimisticStatusRecords(records);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await cms.apiKeys.listApiKeys({ query: { limit: 100, offset: 0 } });
      setRecords(response.data);
    } catch (currentError) {
      setError(toDisplayError(currentError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const [createState, submitCreate, isCreatePending] = useActionState(
    async (_previousState: AsyncActionState<IssuedApiKey>, formData: FormData) => {
      try {
        const kind = readRequiredString(formData, "kind") as "publishable" | "secret" | "service";
        const expiresAt = readOptionalString(formData, "expiresAt");
        const response = await cms.apiKeys.createApiKey({
          body: {
            name: readRequiredString(formData, "name"),
            description: readOptionalString(formData, "description"),
            kind,
            roleCodes: parseCommaSeparatedList(readOptionalString(formData, "roleCodes") ?? ""),
            permissionKeys: parseCommaSeparatedList(readOptionalString(formData, "permissionKeys") ?? ""),
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          },
        });
        await refresh();
        return { ok: true, error: null, data: response.data };
      } catch (currentError) {
        return {
          ok: false,
          error: toDisplayError(currentError),
          data: null,
        };
      }
    },
    createIdleAsyncActionState<IssuedApiKey>(),
  );

  useEffect(() => {
    if (!createState.ok || !createState.data || isCreatePending) {
      return;
    }

    setLatestIssuedKey(createState.data);
    createFormRef.current?.reset();
    setIsCreateOpen(false);
  }, [createState, isCreatePending]);

  async function revoke(record: ApiKeyRecord) {
    setActionId(record.id);
    setError(null);
    applyOptimisticStatus({ id: record.id, status: "revoked" });
    try {
      await cms.apiKeys.revokeApiKey({ path: { id: record.id }, body: {} });
      await refresh();
    } catch (currentError) {
      setError(toDisplayError(currentError));
      setRecords((current) => [...current]);
    } finally {
      setActionId(null);
    }
  }

  async function rotate(record: ApiKeyRecord) {
    setActionId(record.id);
    setError(null);
    try {
      const response = await cms.apiKeys.rotateApiKey({ path: { id: record.id }, body: {} });
      setLatestIssuedKey(response.data);
      await refresh();
    } catch (currentError) {
      setError(toDisplayError(currentError));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
      <Card eyebrow="Machine identities" title="Issued API keys">
        <div className="mb-5 flex flex-col gap-4 border-b border-[color:var(--color-border)] pb-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            Manage server-to-server credentials backed by the same authz model used by the CMS.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void refresh()}>
              Refresh
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>Issue API key</Button>
          </div>
        </div>
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <EmptyState text="Loading API keys..." /> : null}
        {!isLoading ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border)] text-left text-[color:var(--color-ink-subtle)]">
                  <th className="px-4 py-3 font-medium">Key</th>
                  <th className="px-4 py-3 font-medium">Kind</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last used</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {optimisticRecords.map((record) => (
                  <tr key={record.id} className="border-b border-[color:var(--color-border)] last:border-b-0">
                    <td className="px-4 py-4">
                      <p className="font-medium text-[color:var(--color-ink)]">{record.name}</p>
                      <p className="mt-1 text-[color:var(--color-ink-muted)]">{record.keyPrefix}</p>
                    </td>
                    <td className="px-4 py-4"><Badge>{record.kind}</Badge></td>
                    <td className="px-4 py-4">
                      <Badge tone={record.status === "active" ? "success" : "warning"}>{record.status}</Badge>
                    </td>
                    <td className="px-4 py-4 text-[color:var(--color-ink-muted)]">
                      {formatDateTime(record.lastUsedAt ?? record.updatedAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          disabled={actionId === record.id || record.status === "revoked"}
                          onClick={() => rotate(record)}
                        >
                          {actionId === record.id ? "Working..." : "Rotate"}
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={actionId === record.id || record.status === "revoked"}
                          onClick={() => revoke(record)}
                        >
                          Revoke
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Card eyebrow="One-time secret" title="Latest issued credential">
        <p className="mb-4 text-sm leading-7 text-[color:var(--color-ink-muted)]">
          Raw API keys are only visible on create or rotate. Store them in a vault before leaving this view.
        </p>
        {latestIssuedKey ? (
          <div className="grid gap-4">
            <div className="rounded-xl border border-[color:var(--color-border)] bg-slate-950 px-4 py-4 font-mono text-xs leading-6 text-slate-100">
              {latestIssuedKey.apiKey}
            </div>
            <JsonView title="Issued metadata" value={latestIssuedKey.record} />
          </div>
        ) : (
          <EmptyState text="Issue or rotate an API key to inspect the one-time secret and metadata payload." />
        )}
      </Card>

      <Dialog
        open={isCreateOpen}
        title="Issue API key"
        description="Create a machine identity for integrations, jobs, or external operator tools."
        onClose={() => setIsCreateOpen(false)}
        width="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button form="create-api-key-form" type="submit" disabled={isCreatePending}>
              {isCreatePending ? "Issuing..." : "Issue API key"}
            </Button>
          </>
        }
      >
        <form ref={createFormRef} id="create-api-key-form" className="grid gap-4 lg:grid-cols-2" action={submitCreate}>
          <Input label="Name" name="name" required />
          <Select label="Kind" name="kind" defaultValue="secret">
            <option value="publishable">Publishable</option>
            <option value="secret">Secret</option>
            <option value="service">Service</option>
          </Select>
          <div className="lg:col-span-2">
            <Textarea label="Description" name="description" />
          </div>
          <Input
            label="Role codes"
            name="roleCodes"
            hint="Comma-separated, for example: admin, editor"
          />
          <Input
            label="Permission keys"
            name="permissionKeys"
            hint="Comma-separated canonical permission keys."
          />
          <Input label="Expires at" name="expiresAt" type="datetime-local" />
          <div className="lg:col-span-2">
            {createState.error ? <ErrorBanner message={createState.error} /> : null}
          </div>
        </form>
      </Dialog>
    </div>
  );
}
