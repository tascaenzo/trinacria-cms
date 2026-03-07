import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Card, Dialog, Input, Textarea } from "@trinacria-cms/admin-ui";
import type { ListPermissionsResponse, ListRolesResponse } from "@trinacria-cms/sdk";
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

type RoleRecord = ListRolesResponse["data"][number];
type PermissionRecord = ListPermissionsResponse["data"][number];

export function RolesPage() {
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
      <Card eyebrow="Roles" title="Roles and embedded grants">
        <div className="mb-5 flex flex-col gap-4 border-b border-[color:var(--color-border)] pb-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            Manage role metadata and the embedded permission grants persisted directly on role records.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void refresh()}>
              Refresh
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>Create role</Button>
          </div>
        </div>
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <EmptyState text="Loading roles..." /> : null}
        {!isLoading ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border)] text-left text-[color:var(--color-ink-subtle)]">
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Permissions</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium">Action</th>
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
                      {(record.permissions ?? []).length > 0 ? (record.permissions ?? []).join(", ") : "No embedded grants"}
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={record.status === "active" ? "success" : "warning"}>
                        {record.status}
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
                        {actionId === record.id ? "Updating..." : record.status === "active" ? "Disable" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Dialog
        open={isCreateOpen}
        title="Create role"
        description="Define role metadata and select the embedded permission grants to materialize on the record."
        onClose={() => setIsCreateOpen(false)}
        width="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button form="create-role-form" type="submit" disabled={isCreatePending}>
              {isCreatePending ? "Creating..." : "Create role"}
            </Button>
          </>
        }
      >
        <form ref={createFormRef} id="create-role-form" className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]" action={submitCreate}>
          <div className="grid gap-4">
            <Input label="Code" name="code" required />
            <Input label="Name" name="name" required />
            <Textarea label="Description" name="description" />
            {createState.error ? <ErrorBanner message={createState.error} /> : null}
          </div>
          <div className="grid gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[color:var(--color-ink-subtle)]">
              Embedded permission grants
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
