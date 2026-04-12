import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Card, Dialog, Input, Textarea } from "@trinacria-cms/trinacria-ui";
import type { ListPermissionsResponse, ListRolesResponse } from "@trinacria-cms/sdk";
import { MobileRecordCard, MobileRecordField, MobileRecordList } from "../components/mobile-records.js";
import { ErrorBanner, EmptyState } from "../components/resource-feedback.js";
import { useOptimisticStatusRecords } from "../hooks/use-optimistic-status-records.js";
import { formatDateTime } from "../lib/formatting.js";
import {
  type AsyncActionState,
  createIdleAsyncActionState,
  readOptionalString,
  readRequiredString,
  readStringArray,
} from "../runtime/action-state.js";
import { cms } from "../runtime/cms-sdk.js";
import { toDisplayError } from "../lib/sdk-errors.js";
import { useI18n } from "../lib/i18n.js";
import { translateStatusLabel } from "../lib/ui-translations.js";

type RoleRecord = ListRolesResponse["data"][number];
type PermissionRecord = ListPermissionsResponse["data"][number];

export function RolesPage() {
  const { t } = useI18n();
  const [records, setRecords] = useState<readonly RoleRecord[]>([]);
  const [permissions, setPermissions] = useState<readonly PermissionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const createFormRef = useRef<HTMLFormElement>(null);
  const [optimisticRecords, applyOptimisticStatus] = useOptimisticStatusRecords(records);

  const activePermissions = useMemo(
    () => permissions.filter((permission) => permission.status === "active"),
    [permissions],
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        cms.roles.listRoles({ query: { limit: 50, offset: 0 } }),
        cms.permissions.listPermissions({ query: { limit: 100, offset: 0 } }),
      ]);
      setRecords(rolesResponse.data);
      setPermissions(permissionsResponse.data);
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
        await cms.roles.createRole({
          body: {
            code: readRequiredString(formData, "code"),
            name: readRequiredString(formData, "name"),
            description: readOptionalString(formData, "description"),
            permissions: readStringArray(formData, "permissionKeys"),
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

  async function toggleStatus(record: RoleRecord) {
    const nextStatus = record.status === "active" ? "disabled" : "active";
    setActionId(record.id);
    setError(null);
    applyOptimisticStatus({ id: record.id, status: nextStatus });
    try {
      await cms.roles.updateRoleStatus({
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
      <Card eyebrow={t("roles.eyebrow")} title={t("roles.title")}>
        <div className="mb-5 flex flex-col gap-4 border-b border-[color:var(--color-border)] pb-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            {t("roles.summary")}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void refresh()}>
              {t("common.actions.refresh")}
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>{t("roles.actions.create")}</Button>
          </div>
        </div>
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <EmptyState text={t("roles.empty.loading")} /> : null}
        {!isLoading ? (
          <>
            <MobileRecordList>
              {optimisticRecords.map((record) => (
                <MobileRecordCard
                  key={record.id}
                  title={record.name}
                  subtitle={record.code}
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
                    label={t("roles.table.permissions")}
                    value={
                      (record.permissions ?? []).length > 0
                        ? (record.permissions ?? []).join(", ")
                        : t("roles.table.no_embedded_grants")
                    }
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
                    <th className="px-4 py-3 font-medium">{t("roles.table.role")}</th>
                    <th className="px-4 py-3 font-medium">{t("roles.table.permissions")}</th>
                    <th className="px-4 py-3 font-medium">{t("common.table.status")}</th>
                    <th className="px-4 py-3 font-medium">{t("common.table.updated")}</th>
                    <th className="px-4 py-3 font-medium">{t("common.table.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {optimisticRecords.map((record) => (
                    <tr key={record.id} className="border-b border-[color:var(--color-border)] last:border-b-0">
                      <td className="px-4 py-4">
                        <p className="font-medium text-[color:var(--color-ink)]">{record.name}</p>
                        <p className="mt-1 text-[color:var(--color-ink-muted)]">{record.code}</p>
                      </td>
                      <td className="px-4 py-4 text-[color:var(--color-ink-muted)]">
                        {(record.permissions ?? []).length > 0
                          ? (record.permissions ?? []).join(", ")
                          : t("roles.table.no_embedded_grants")}
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
        title={t("roles.dialog.create.title")}
        description={t("roles.dialog.create.description")}
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
            <Button form="create-role-form" type="submit" disabled={isCreatePending}>
              {isCreatePending ? t("common.actions.creating") : t("roles.actions.create")}
            </Button>
          </>
        }
      >
        <form
          ref={createFormRef}
          id="create-role-form"
          className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]"
          action={submitCreate}
        >
          <div className="grid gap-4">
            <Input label={t("roles.form.code")} name="code" required />
            <Input label={t("roles.form.name")} name="name" required />
            <Textarea label={t("common.form.description")} name="description" />
            {createState.error ? <ErrorBanner message={createState.error} /> : null}
          </div>
          <div className="grid gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[color:var(--color-ink-subtle)]">
              {t("roles.form.embedded_permission_grants")}
            </p>
            <div className="grid max-h-[420px] gap-2 overflow-auto rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] p-3 sm:grid-cols-2">
              {activePermissions.map((permission) => (
                <label
                  key={permission.id}
                  className="flex items-start gap-3 rounded-xl border border-[color:var(--color-border)] bg-white px-3 py-3 text-sm"
                >
                  <input type="checkbox" name="permissionKeys" value={permission.key} className="mt-1" />
                  <span>
                    <span className="block font-medium text-[color:var(--color-ink)]">{permission.displayName}</span>
                    <span className="text-[color:var(--color-ink-muted)]">{permission.key}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
