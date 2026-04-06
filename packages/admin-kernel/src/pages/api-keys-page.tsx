import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Dialog, Input, JsonView, Select, Textarea } from "@trinacria-cms/admin-ui";
import type { CreateApiKeyResponse, ListApiKeysResponse } from "@trinacria-cms/sdk";
import { MobileRecordCard, MobileRecordField, MobileRecordList } from "../components/mobile-records.js";
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
import { useI18n } from "../lib/i18n.js";
import { translateApiKeyKind, translateStatusLabel } from "../lib/ui-translations.js";

type ApiKeyRecord = ListApiKeysResponse["data"][number];
type IssuedApiKey = CreateApiKeyResponse["data"];

export function ApiKeysPage() {
  const { t } = useI18n();
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
      <Card eyebrow={t("api_keys.eyebrow")} title={t("api_keys.title")}>
        <div className="mb-5 flex flex-col gap-4 border-b border-[color:var(--color-border)] pb-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            {t("api_keys.summary")}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void refresh()}>
              {t("common.actions.refresh")}
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>{t("api_keys.actions.issue")}</Button>
          </div>
        </div>
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <EmptyState text={t("api_keys.empty.loading")} /> : null}
        {!isLoading ? (
          <>
            <MobileRecordList>
              {optimisticRecords.map((record) => (
                <MobileRecordCard
                  key={record.id}
                  title={record.name}
                  subtitle={record.keyPrefix}
                  badges={
                    <Badge tone={record.status === "active" ? "success" : "warning"}>
                      {translateStatusLabel(record.status, t)}
                    </Badge>
                  }
                  actions={
                    <div className="grid gap-2">
                      <Button
                        variant="secondary"
                        className="w-full"
                        disabled={actionId === record.id || record.status === "revoked"}
                        onClick={() => rotate(record)}
                      >
                        {actionId === record.id ? t("common.actions.working") : t("common.actions.rotate")}
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full"
                        disabled={actionId === record.id || record.status === "revoked"}
                        onClick={() => revoke(record)}
                      >
                        {t("common.actions.revoke")}
                      </Button>
                    </div>
                  }
                >
                  <MobileRecordField
                    label={t("api_keys.table.kind")}
                    value={<Badge>{translateApiKeyKind(record.kind, t)}</Badge>}
                  />
                  <MobileRecordField
                    label={t("api_keys.table.last_used")}
                    value={formatDateTime(record.lastUsedAt ?? record.updatedAt)}
                  />
                </MobileRecordCard>
              ))}
            </MobileRecordList>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--color-border)] text-left text-[color:var(--color-ink-subtle)]">
                    <th className="px-4 py-3 font-medium">{t("common.table.key")}</th>
                    <th className="px-4 py-3 font-medium">{t("api_keys.table.kind")}</th>
                    <th className="px-4 py-3 font-medium">{t("common.table.status")}</th>
                    <th className="px-4 py-3 font-medium">{t("api_keys.table.last_used")}</th>
                    <th className="px-4 py-3 font-medium">{t("api_keys.table.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {optimisticRecords.map((record) => (
                    <tr key={record.id} className="border-b border-[color:var(--color-border)] last:border-b-0">
                      <td className="px-4 py-4">
                        <p className="font-medium text-[color:var(--color-ink)]">{record.name}</p>
                        <p className="mt-1 text-[color:var(--color-ink-muted)]">{record.keyPrefix}</p>
                      </td>
                      <td className="px-4 py-4">
                        <Badge>{translateApiKeyKind(record.kind, t)}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={record.status === "active" ? "success" : "warning"}>
                          {translateStatusLabel(record.status, t)}
                        </Badge>
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
                            {actionId === record.id ? t("common.actions.working") : t("common.actions.rotate")}
                          </Button>
                          <Button
                            variant="ghost"
                            disabled={actionId === record.id || record.status === "revoked"}
                            onClick={() => revoke(record)}
                          >
                            {t("common.actions.revoke")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </Card>

      <Card eyebrow={t("api_keys.secret.eyebrow")} title={t("api_keys.secret.title")}>
        <p className="mb-4 text-sm leading-7 text-[color:var(--color-ink-muted)]">
          {t("api_keys.secret.summary")}
        </p>
        {latestIssuedKey ? (
          <div className="grid gap-4">
            <div className="rounded-xl border border-[color:var(--color-border)] bg-slate-950 px-4 py-4 font-mono text-xs leading-6 text-slate-100">
              {latestIssuedKey.apiKey}
            </div>
            <JsonView title={t("api_keys.secret.issued_metadata")} value={latestIssuedKey.record} />
          </div>
        ) : (
          <EmptyState text={t("api_keys.empty.secret")} />
        )}
      </Card>

      <Dialog
        open={isCreateOpen}
        title={t("api_keys.dialog.create.title")}
        description={t("api_keys.dialog.create.description")}
        eyebrow={t("common.dialog.create")}
        closeLabel={t("common.actions.close")}
        variant="drawer"
        onClose={() => setIsCreateOpen(false)}
        width="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button form="create-api-key-form" type="submit" disabled={isCreatePending}>
              {isCreatePending ? t("api_keys.actions.issuing") : t("api_keys.actions.issue")}
            </Button>
          </>
        }
      >
        <form ref={createFormRef} id="create-api-key-form" className="grid gap-4 lg:grid-cols-2" action={submitCreate}>
          <Input label={t("common.form.name")} name="name" required />
          <Select label={t("api_keys.form.kind")} name="kind" defaultValue="secret">
            <option value="publishable">{t("common.api_key_kind.publishable")}</option>
            <option value="secret">{t("common.api_key_kind.secret")}</option>
            <option value="service">{t("common.api_key_kind.service")}</option>
          </Select>
          <div className="lg:col-span-2">
            <Textarea label={t("common.form.description")} name="description" />
          </div>
          <Input
            label={t("api_keys.form.role_codes")}
            name="roleCodes"
            hint={t("api_keys.form.role_codes_hint")}
          />
          <Input
            label={t("api_keys.form.permission_keys")}
            name="permissionKeys"
            hint={t("api_keys.form.permission_keys_hint")}
          />
          <Input label={t("api_keys.form.expires_at")} name="expiresAt" type="datetime-local" />
          <div className="lg:col-span-2">
            {createState.error ? <ErrorBanner message={createState.error} /> : null}
          </div>
        </form>
      </Dialog>
    </div>
  );
}
