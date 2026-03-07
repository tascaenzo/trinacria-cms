import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Dialog, Input } from "@trinacria-cms/admin-ui";
import type { ListUsersResponse } from "@trinacria-cms/sdk";
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

type UserRecord = ListUsersResponse["data"][number];

/**
 * UsersPage now uses React 19 actions for modal submission and optimistic
 * status updates for lifecycle toggles.
 */
export function UsersPage() {
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
      <Card eyebrow="Users" title="User directory">
        <div className="mb-5 flex flex-col gap-4 border-b border-[color:var(--color-border)] pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-[color:var(--color-ink-muted)]">
              Active user registry, lifecycle state, and operator actions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void refresh()}>
              Refresh
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>Create user</Button>
          </div>
        </div>
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <EmptyState text="Loading users..." /> : null}
        {!isLoading ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border)] text-left text-[color:var(--color-ink-subtle)]">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium">Action</th>
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
                        {actionId === record.id
                          ? "Updating..."
                          : record.status === "active"
                            ? "Suspend"
                            : "Activate"}
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
        title="Create user"
        description="Add a new CMS user to the core-pack identity registry."
        onClose={() => setIsCreateOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button form="create-user-form" type="submit" disabled={isCreatePending}>
              {isCreatePending ? "Creating..." : "Create user"}
            </Button>
          </>
        }
      >
        <form ref={createFormRef} id="create-user-form" className="grid gap-4" action={submitCreate}>
          <Input label="Email" type="email" name="email" required />
          <Input label="Display name" name="displayName" required />
          {createState.error ? <ErrorBanner message={createState.error} /> : null}
        </form>
      </Dialog>
    </div>
  );
}
