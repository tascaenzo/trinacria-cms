import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeadCell,
  DataTableHeaderRow,
  DataTablePrimaryCell,
  DataTableRow,
  DataTableTable,
  Dialog,
  FeedbackBanner,
  InfoCard,
  Input,
  Select
} from "@trinacria-cms/trinacria-ui";
import type {
  ListRolesResponse,
  ListUserEffectivePermissionsResponse,
  ListUserRolesResponse,
  ListUsersResponse
} from "@trinacria-cms/sdk";
import {
  MobileRecordCard,
  MobileRecordField,
  MobileRecordList
} from "../components/mobile-records.js";
import { JsonPreviewAction } from "../components/json-preview-action.js";
import { ErrorBanner, EmptyState } from "../components/resource-feedback.js";
import { formatDateTime } from "../lib/formatting.js";
import {
  type AsyncActionState,
  createIdleAsyncActionState,
  readRequiredString
} from "../runtime/action-state.js";
import { useOptimisticStatusRecords } from "../hooks/use-optimistic-status-records.js";
import { cms } from "../runtime/cms-sdk.js";
import { toDisplayError } from "../lib/sdk-errors.js";
import { useI18n } from "../lib/i18n.js";
import { translateStatusLabel } from "../lib/ui-translations.js";

type UserRecord = ListUsersResponse["data"][number];
type RoleRecord = ListRolesResponse["data"][number];
type UserRoleAssignment = ListUserRolesResponse["data"][number];
type UserPermissionKey = ListUserEffectivePermissionsResponse["data"][number];

/**
 * UsersPage now uses React 19 actions for modal submission and optimistic
 * status updates for lifecycle toggles.
 */
export function UsersPage() {
  const { t } = useI18n();
  const [records, setRecords] = useState<readonly UserRecord[]>([]);
  const [roles, setRoles] = useState<readonly RoleRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [selectedUserRoles, setSelectedUserRoles] = useState<readonly UserRoleAssignment[]>([]);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState<
    readonly UserPermissionKey[]
  >([]);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const createFormRef = useRef<HTMLFormElement>(null);
  const [optimisticRecords, applyOptimisticStatus] = useOptimisticStatusRecords(records);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        cms.users.listUsers({ query: { limit: 50, offset: 0 } }),
        cms.roles.listRoles({ query: { limit: 100, offset: 0 } })
      ]);
      setRecords(usersResponse.data);
      setRoles(rolesResponse.data);
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
            firstName: readRequiredString(formData, "firstName"),
            lastName: readRequiredString(formData, "lastName"),
            displayName: readRequiredString(formData, "displayName")
          }
        });
        await refresh();
        return { ok: true, error: null, data: null };
      } catch (currentError) {
        return {
          ok: false,
          error: toDisplayError(currentError),
          data: null
        };
      }
    },
    createIdleAsyncActionState()
  );

  const [profileState, submitProfile, isProfilePending] = useActionState(
    async (_previousState: AsyncActionState, formData: FormData) => {
      if (!selectedUser) {
        return { ok: false, error: t("users.feedback.select_user"), data: null };
      }

      try {
        const response = await cms.users.updateUserProfile({
          path: { id: selectedUser.id },
          body: {
            displayName: readRequiredString(formData, "displayName")
          }
        });
        setSelectedUser(response.data);
        await refresh();
        return { ok: true, error: null, data: null };
      } catch (currentError) {
        return {
          ok: false,
          error: toDisplayError(currentError),
          data: null
        };
      }
    },
    createIdleAsyncActionState()
  );

  const [assignRoleState, submitAssignRole, isAssignRolePending] = useActionState(
    async (_previousState: AsyncActionState, formData: FormData) => {
      if (!selectedUser) {
        return { ok: false, error: t("users.feedback.select_user"), data: null };
      }

      try {
        await cms.security.assignUserRole({
          path: { id: selectedUser.id },
          body: {
            roleCode: readRequiredString(formData, "roleCode")
          }
        });
        await refreshSelectedUser(selectedUser.id);
        return { ok: true, error: null, data: null };
      } catch (currentError) {
        return {
          ok: false,
          error: toDisplayError(currentError),
          data: null
        };
      }
    },
    createIdleAsyncActionState()
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
        body: { status: nextStatus }
      });
      await refresh();
    } catch (currentError) {
      setError(toDisplayError(currentError));
      setRecords((current) => [...current]);
    } finally {
      setActionId(null);
    }
  }

  async function openManageUser(record: UserRecord) {
    setSelectedUser(record);
    setIsManageOpen(true);
    await refreshSelectedUser(record.id);
  }

  async function refreshSelectedUser(userId: string) {
    setIsDetailLoading(true);
    setDetailError(null);
    try {
      const [userResponse, roleAssignments, effectivePermissions] = await Promise.all([
        cms.users.getUserById({ path: { id: userId } }),
        cms.security.listUserRoles({ path: { id: userId } }),
        cms.security.listUserEffectivePermissions({ path: { id: userId } })
      ]);
      setSelectedUser(userResponse.data);
      setSelectedUserRoles(roleAssignments.data);
      setSelectedUserPermissions(effectivePermissions.data);
    } catch (currentError) {
      setDetailError(toDisplayError(currentError));
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function removeRoleAssignment(roleCode: string) {
    if (!selectedUser) return;
    setActionId(`${selectedUser.id}:${roleCode}`);
    setDetailError(null);
    try {
      const response = await cms.security.removeUserRole({
        path: { id: selectedUser.id, roleCode }
      });
      setSelectedUserRoles(response.data);
      const permissions = await cms.security.listUserEffectivePermissions({
        path: { id: selectedUser.id }
      });
      setSelectedUserPermissions(permissions.data);
    } catch (currentError) {
      setDetailError(toDisplayError(currentError));
    } finally {
      setActionId(null);
    }
  }

  const assignedRoleCodes = new Set(selectedUserRoles.map((assignment) => assignment.roleCode));
  const assignableRoles = roles.filter(
    (role) => role.status === "active" && !assignedRoleCodes.has(role.code)
  );

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
                    <div className="grid gap-2">
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => void openManageUser(record)}
                      >
                        {t("users.actions.manage")}
                      </Button>
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
                    </div>
                  }
                >
                  <MobileRecordField
                    label={t("common.table.updated")}
                    value={formatDateTime(record.updatedAt)}
                  />
                </MobileRecordCard>
              ))}
            </MobileRecordList>

            <DataTable>
              <DataTableTable>
                <DataTableHead>
                  <DataTableHeaderRow>
                    <DataTableHeadCell>{t("users.table.user")}</DataTableHeadCell>
                    <DataTableHeadCell>{t("common.table.status")}</DataTableHeadCell>
                    <DataTableHeadCell>{t("common.table.updated")}</DataTableHeadCell>
                    <DataTableHeadCell>{t("common.table.action")}</DataTableHeadCell>
                  </DataTableHeaderRow>
                </DataTableHead>
                <DataTableBody>
                  {optimisticRecords.map((record) => (
                    <DataTableRow key={record.id}>
                      <DataTablePrimaryCell meta={record.email}>
                        {record.displayName}
                      </DataTablePrimaryCell>
                      <DataTableCell>
                        <Badge tone={record.status === "active" ? "success" : "warning"}>
                          {translateStatusLabel(record.status, t)}
                        </Badge>
                      </DataTableCell>
                      <DataTableCell className="text-[color:var(--color-ink-muted)]">
                        {formatDateTime(record.updatedAt)}
                      </DataTableCell>
                      <DataTableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" onClick={() => void openManageUser(record)}>
                            {t("users.actions.manage")}
                          </Button>
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
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTableTable>
            </DataTable>
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
        <form
          ref={createFormRef}
          id="create-user-form"
          className="grid gap-4"
          action={submitCreate}
        >
          <Input label={t("auth.login.email_label")} type="email" name="email" required />
          <Input label={t("common.form.first_name")} name="firstName" required />
          <Input label={t("common.form.last_name")} name="lastName" required />
          <Input label={t("users.form.display_name")} name="displayName" required />
          {createState.error ? <ErrorBanner message={createState.error} /> : null}
        </form>
      </Dialog>

      <Dialog
        open={isManageOpen}
        title={selectedUser?.displayName ?? t("users.dialog.manage.title")}
        description={selectedUser?.email}
        eyebrow={t("users.dialog.manage.eyebrow")}
        closeLabel={t("common.actions.close")}
        closeVariant="icon"
        variant="drawer"
        width="xl"
        onClose={() => setIsManageOpen(false)}
      >
        {selectedUser ? (
          <div className="grid gap-5">
            {detailError ? <ErrorBanner message={detailError} /> : null}
            {isDetailLoading ? <EmptyState text={t("users.empty.loading_detail")} /> : null}

            <InfoCard eyebrow={t("users.detail.profile")}>
              <form action={submitProfile} className="grid gap-4">
                {profileState.ok ? (
                  <FeedbackBanner tone="success" message={t("users.feedback.profile_updated")} />
                ) : null}
                {profileState.error ? <ErrorBanner message={profileState.error} /> : null}
                <Input
                  label={t("common.form.display_name")}
                  name="displayName"
                  defaultValue={selectedUser.displayName}
                  required
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={isProfilePending}>
                    {isProfilePending ? t("common.actions.updating") : t("common.actions.update")}
                  </Button>
                </div>
              </form>
            </InfoCard>

            <InfoCard eyebrow={t("users.detail.roles")}>
              <div className="grid gap-4">
                <form action={submitAssignRole} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Select
                    label={t("users.form.assign_role")}
                    name="roleCode"
                    disabled={assignableRoles.length === 0}
                    required
                  >
                    <option value="">{t("users.form.assign_role_placeholder")}</option>
                    {assignableRoles.map((role) => (
                      <option key={role.id} value={role.code}>
                        {role.name} ({role.code})
                      </option>
                    ))}
                  </Select>
                  <div className="self-end">
                    <Button
                      type="submit"
                      disabled={isAssignRolePending || assignableRoles.length === 0}
                    >
                      {isAssignRolePending
                        ? t("common.actions.updating")
                        : t("users.actions.assign_role")}
                    </Button>
                  </div>
                </form>
                {assignRoleState.error ? <ErrorBanner message={assignRoleState.error} /> : null}
                {assignRoleState.ok ? (
                  <FeedbackBanner tone="success" message={t("users.feedback.role_assigned")} />
                ) : null}

                <div className="grid gap-2">
                  {selectedUserRoles.length > 0 ? (
                    selectedUserRoles.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-[color:var(--color-ink)]">
                            {formatRoleLabel(assignment.roleCode)}
                          </p>
                          <p className="text-xs text-[color:var(--color-ink-muted)]">
                            {assignment.roleCode}
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          disabled={actionId === `${selectedUser.id}:${assignment.roleCode}`}
                          onClick={() => void removeRoleAssignment(assignment.roleCode)}
                        >
                          {t("common.actions.revoke")}
                        </Button>
                      </div>
                    ))
                  ) : (
                    <EmptyState text={t("users.detail.no_roles")} />
                  )}
                </div>
              </div>
            </InfoCard>

            <JsonPreviewAction
              title={t("users.detail.effective_permissions")}
              payloadTitle={t("users.detail.effective_permissions")}
              value={selectedUserPermissions}
            />
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function formatRoleLabel(roleCode: string): string {
  return roleCode
    .trim()
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
