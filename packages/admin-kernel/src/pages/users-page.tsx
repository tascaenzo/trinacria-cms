import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Dialog, Input } from "@trinacria-cms/trinacria-ui";
import type { ListUsersResponse } from "@trinacria-cms/sdk";
import { MobileRecordCard, MobileRecordField, MobileRecordList } from "../components/mobile-records.js";
import { ErrorBanner, EmptyState } from "../components/resource-feedback.js";
import { formatDateTime } from "../lib/formatting.js";
import {
  type AsyncActionState,
  createIdleAsyncActionState,
  readRequiredString,
} from "../runtime/action-state.js";
import { useOptimisticStatusRecords } from "../hooks/use-optimistic-status-records.js";
import { cms } from "../runtime/cms-sdk.js";
import { toDisplayError } from "../lib/sdk-errors.js";
import { useI18n } from "../lib/i18n.js";
import { translateStatusLabel } from "../lib/ui-translations.js";

type UserRecord = ListUsersResponse["data"][number];

/**
 * UsersPage now uses React 19 actions for modal submission and optimistic
 * status updates for lifecycle toggles.
 */
export function UsersPage() {
  const { t } = useI18n();
  const [records, setRecords] = useState<readonly UserRecord[]>([]);
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
      const response = await cms.users.listUsers({ query: { limit: 50, offset: 0 } });
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
        await cms.users.createUser({
          body: {
            email: readRequiredString(formData, "email"),
            displayName: readRequiredString(formData, "displayName"),
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

  async function toggleStatus(record: UserRecord) {
    const nextStatus = record.status === "active" ? "suspended" : "active";
    setActionId(record.id);
    setError(null);
    applyOptimisticStatus({ id: record.id, status: nextStatus });
    try {
      await cms.users.updateUserStatus({
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
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => void refresh()}>
          {t("common.actions.refresh")}
        </Button>
        <Button onClick={() => setIsCreateOpen(true)}>{t("users.actions.create")}</Button>
      </div>

      <Card eyebrow={t("users.eyebrow")} title={t("users.title")}>
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <EmptyState text={t("users.empty.loading")} /> : null}
        {!isLoading ? (
          <>
            <MobileRecordList>
              {optimisticRecords.map((record) => (
                <MobileRecordCard
                  key={record.id}
                  title={record.displayName}
                  subtitle={record.email}
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
                          ? t("users.actions.suspend")
                          : t("common.actions.activate")}
                    </Button>
                  }
                >
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
                    <th className="px-4 py-3 font-medium">{t("users.table.user")}</th>
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
                        <p className="mt-1 text-[color:var(--color-ink-muted)]">{record.email}</p>
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={record.status === "active" ? "success" : "warning"}>
                          {translateStatusLabel(record.status, t)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-[color:var(--color-ink-muted)]">
                        {formatDateTime(record.updatedAt)}
                      </td>
                      <td className="px-4 py-4">
                        <Button
                          variant="secondary"
                          disabled={actionId === record.id}
                          onClick={() => toggleStatus(record)}
                        >
                          {actionId === record.id
                            ? t("common.actions.updating")
                            : record.status === "active"
                              ? t("users.actions.suspend")
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
        title={t("users.dialog.create.title")}
        description={t("users.dialog.create.description")}
        eyebrow={t("common.dialog.create")}
        closeLabel={t("common.actions.close")}
        variant="drawer"
        onClose={() => setIsCreateOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button form="create-user-form" type="submit" disabled={isCreatePending}>
              {isCreatePending ? t("common.actions.creating") : t("users.actions.create")}
            </Button>
          </>
        }
      >
        <form ref={createFormRef} id="create-user-form" className="grid gap-4" action={submitCreate}>
          <Input label={t("auth.login.email_label")} type="email" name="email" required />
          <Input label={t("users.form.display_name")} name="displayName" required />
          {createState.error ? <ErrorBanner message={createState.error} /> : null}
        </form>
      </Dialog>
    </div>
  );
}
