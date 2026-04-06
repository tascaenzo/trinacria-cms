import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Dialog, Input, Textarea } from "@trinacria-cms/admin-ui";
import type { ListPermissionsResponse } from "@trinacria-cms/sdk";
import { MobileRecordCard, MobileRecordField, MobileRecordList } from "../components/mobile-records.js";
import { ErrorBanner, EmptyState } from "../components/resource-feedback.js";
import { useOptimisticStatusRecords } from "../hooks/use-optimistic-status-records.js";
import { formatDateTime } from "../lib/formatting.js";
import {
  type AsyncActionState,
  createIdleAsyncActionState,
  readOptionalString,
  readRequiredString,
} from "../runtime/action-state.js";
import { cms } from "../runtime/cms-sdk.js";
import { toDisplayError } from "../lib/sdk-errors.js";
import { useI18n } from "../lib/i18n.js";
import { translateStatusLabel } from "../lib/ui-translations.js";

type PermissionRecord = ListPermissionsResponse["data"][number];

export function PermissionsPage() {
  const { t } = useI18n();
  const [records, setRecords] = useState<readonly PermissionRecord[]>([]);
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
      const response = await cms.permissions.listPermissions({ query: { limit: 100, offset: 0 } });
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
    async (_previousState: AsyncActionState, formData: FormData) => {
      try {
        await cms.permissions.createPermission({
          body: {
            key: readRequiredString(formData, "key"),
            displayName: readRequiredString(formData, "displayName"),
            description: readOptionalString(formData, "description"),
          },
        });
        await refresh();
        return { ok: true, error: null, data: null };
      } catch (currentError) {
        return {
          ok: false,
          error: toDisplayError(currentError),
          data: null,
        };
      }
    },
    createIdleAsyncActionState(),
  );

  useEffect(() => {
    if (!createState.ok || isCreatePending) {
      return;
    }

    createFormRef.current?.reset();
    setIsCreateOpen(false);
  }, [createState.ok, isCreatePending]);

  async function toggleStatus(record: PermissionRecord) {
    const nextStatus = record.status === "active" ? "disabled" : "active";
    setActionId(record.id);
    setError(null);
    applyOptimisticStatus({ id: record.id, status: nextStatus });
    try {
      await cms.permissions.updatePermissionStatus({
        path: { id: record.id },
        body: { status: nextStatus },
      });
      await refresh();
    } catch (currentError) {
      setError(toDisplayError(currentError));
      setRecords((current) => [...current]);
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="grid gap-4">
      <Card eyebrow={t("permissions.eyebrow")} title={t("permissions.title")}>
        <div className="mb-5 flex flex-col gap-4 border-b border-[color:var(--color-border)] pb-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            {t("permissions.summary")}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void refresh()}>
              {t("common.actions.refresh")}
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>{t("permissions.actions.create")}</Button>
          </div>
        </div>
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <EmptyState text={t("permissions.empty.loading")} /> : null}
        {!isLoading ? (
          <>
            <MobileRecordList>
              {optimisticRecords.map((record) => (
                <MobileRecordCard
                  key={record.id}
                  title={record.displayName}
                  subtitle={record.key}
                  badges={
                    <Badge tone={record.status === "active" ? "success" : "warning"}>
                      {translateStatusLabel(record.status, t)}
                    </Badge>
                  }
                  actions={
                    <Button
                      variant="secondary"
                      className="w-full"
                      disabled={actionId === record.id}
                      onClick={() => toggleStatus(record)}
                    >
                      {actionId === record.id
                        ? t("common.actions.updating")
                        : record.status === "active"
                          ? t("common.actions.disable")
                          : t("common.actions.activate")}
                    </Button>
                  }
                >
                  <MobileRecordField
                    label={t("permissions.table.source")}
                    value={record.sourcePluginId}
                  />
                  <MobileRecordField
                    label={t("common.table.updated")}
                    value={formatDateTime(record.updatedAt)}
                  />
                </MobileRecordCard>
              ))}
            </MobileRecordList>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--color-border)] text-left text-[color:var(--color-ink-subtle)]">
                    <th className="px-4 py-3 font-medium">{t("permissions.table.permission")}</th>
                    <th className="px-4 py-3 font-medium">{t("permissions.table.source")}</th>
                    <th className="px-4 py-3 font-medium">{t("common.table.status")}</th>
                    <th className="px-4 py-3 font-medium">{t("common.table.updated")}</th>
                    <th className="px-4 py-3 font-medium">{t("common.table.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {optimisticRecords.map((record) => (
                    <tr key={record.id} className="border-b border-[color:var(--color-border)] last:border-b-0">
                      <td className="px-4 py-4">
                        <p className="font-medium text-[color:var(--color-ink)]">{record.displayName}</p>
                        <p className="mt-1 text-[color:var(--color-ink-muted)]">{record.key}</p>
                      </td>
                      <td className="px-4 py-4 text-[color:var(--color-ink-muted)]">{record.sourcePluginId}</td>
                      <td className="px-4 py-4">
                        <Badge tone={record.status === "active" ? "success" : "warning"}>
                          {translateStatusLabel(record.status, t)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-[color:var(--color-ink-muted)]">{formatDateTime(record.updatedAt)}</td>
                      <td className="px-4 py-4">
                        <Button
                          variant="secondary"
                          disabled={actionId === record.id}
                          onClick={() => toggleStatus(record)}
                        >
                          {actionId === record.id
                            ? t("common.actions.updating")
                            : record.status === "active"
                              ? t("common.actions.disable")
                              : t("common.actions.activate")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </Card>

      <Dialog
        open={isCreateOpen}
        title={t("permissions.dialog.create.title")}
        description={t("permissions.dialog.create.description")}
        eyebrow={t("common.dialog.create")}
        closeLabel={t("common.actions.close")}
        variant="drawer"
        onClose={() => setIsCreateOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button form="create-permission-form" type="submit" disabled={isCreatePending}>
              {isCreatePending ? t("common.actions.creating") : t("permissions.actions.create")}
            </Button>
          </>
        }
      >
        <form ref={createFormRef} id="create-permission-form" className="grid gap-4" action={submitCreate}>
          <Input
            label={t("common.form.key")}
            name="key"
            hint={t("permissions.form.key_hint")}
            required
          />
          <Input label={t("common.form.display_name")} name="displayName" required />
          <Textarea label={t("common.form.description")} name="description" />
          {createState.error ? <ErrorBanner message={createState.error} /> : null}
        </form>
      </Dialog>
    </div>
  );
}
