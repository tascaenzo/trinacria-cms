import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DropdownMenu,
  DropdownMenuItem,
  FeedbackBanner,
  Icon,
  Input
} from "@trinacria-cms/trinacria-ui";
import type {
  GetAuthenticatedUserResponse,
  ListUserEffectivePermissionsResponse,
  ListUserRolesResponse
} from "@trinacria-cms/sdk";
import { ErrorBanner, EmptyState } from "../components/resource-feedback.js";
import { JsonPreviewAction } from "../components/json-preview-action.js";
import { formatDateTime } from "../lib/formatting.js";
import { useI18n } from "../lib/i18n.js";
import { toDisplayError } from "../lib/sdk-errors.js";
import { formatUserName } from "../lib/user-formatting.js";
import { cms } from "../runtime/cms-sdk.js";
import { translateStatusLabel } from "../lib/ui-translations.js";
import {
  type AsyncActionState,
  createIdleAsyncActionState,
  readRequiredString
} from "../runtime/action-state.js";

type ProfileUser = GetAuthenticatedUserResponse["data"];
type ProfileRole = ListUserRolesResponse["data"][number];
type ProfilePermissions = ListUserEffectivePermissionsResponse["data"];

export function ProfilePage() {
  const { t } = useI18n();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [roles, setRoles] = useState<readonly ProfileRole[]>([]);
  const [permissions, setPermissions] = useState<ProfilePermissions>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const currentUser = await cms.auth.getAuthenticatedUser();
      const [userRoles, effectivePermissions] = await Promise.all([
        cms.security.listUserRoles({ path: { id: currentUser.data.id } }),
        cms.security.listUserEffectivePermissions({ path: { id: currentUser.data.id } })
      ]);
      setUser(currentUser.data);
      setRoles(userRoles.data);
      setPermissions(effectivePermissions.data);
    } catch (currentError) {
      setError(toDisplayError(currentError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const userName = useMemo(() => formatUserName(user), [user]);
  const initials = useMemo(() => getInitials(userName), [userName]);
  const primaryRole = roles[0]?.roleCode ?? null;
  const [profileState, submitProfile, isProfilePending] = useActionState(
    async (_previousState: AsyncActionState, formData: FormData) => {
      try {
        const response = await cms.auth.updateAuthenticatedUserProfile({
          body: {
            firstName: readRequiredString(formData, "firstName"),
            lastName: readRequiredString(formData, "lastName")
          }
        });
        setUser(response.data);
        window.dispatchEvent(
          new CustomEvent("trinacria-cms:auth-user-updated", {
            detail: response.data
          })
        );
        return {
          ok: true,
          error: null,
          data: null
        };
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
  const [passwordState, submitPassword, isPasswordPending] = useActionState(
    async (_previousState: AsyncActionState, formData: FormData) => {
      try {
        const currentPassword = readRequiredString(formData, "currentPassword");
        const newPassword = readRequiredString(formData, "newPassword");
        const confirmPassword = readRequiredString(formData, "confirmPassword");

        if (newPassword !== confirmPassword) {
          return {
            ok: false,
            error: t("profile.password.mismatch", "New passwords do not match."),
            data: null
          };
        }

        const response = await cms.auth.changeAuthenticatedUserPassword({
          body: {
            currentPassword,
            newPassword
          }
        });
        setUser(response.data);
        return {
          ok: true,
          error: null,
          data: null
        };
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

  return (
    <div className="grid gap-4">
      {error ? <ErrorBanner message={error} /> : null}
      {isLoading ? <EmptyState text={t("profile.loading", "Loading profile...")} /> : null}

      {!isLoading && user ? (
        <>
          <section>
            <Card
              eyebrow={t("profile.eyebrow", "Operator profile")}
              title={t("profile.title", "Your account")}
              className="overflow-hidden p-0"
            >
              <div className="relative min-h-[280px] bg-[radial-gradient(circle_at_20%_10%,rgba(23,119,92,0.20),transparent_32%),linear-gradient(135deg,var(--color-surface),var(--color-canvas))] p-5">
                <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-[5rem] bg-[color:var(--color-action-primary-bg)]/10" />
                <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-action-primary-bg)] text-2xl font-semibold text-[color:var(--color-action-primary-ink)] shadow-sm">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-2xl font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
                        {userName}
                      </h2>
                      <p className="mt-1 truncate text-sm text-[color:var(--color-ink-muted)]">
                        {user.email}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge tone={user.status === "active" ? "success" : "warning"}>
                          {translateStatusLabel(user.status, t)}
                        </Badge>
                        {primaryRole ? <Badge>{formatRoleLabel(primaryRole)}</Badge> : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
                  <ProfileMetric
                    label={t("profile.metrics.roles", "Roles")}
                    value={String(roles.length)}
                  />
                  <ProfileMetric
                    label={t("profile.metrics.permissions", "Permissions")}
                    value={String(permissions.length)}
                  />
                  <ProfileMetric
                    label={t("profile.metrics.status", "Status")}
                    value={translateStatusLabel(user.status, t)}
                  />
                </div>
              </div>
            </Card>
          </section>

          <section>
            <Card>
              <div className="grid gap-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
                      {t("profile.details.eyebrow", "Details")}
                    </p>
                    <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">
                      {t("profile.readonly.title", "Profile information")}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <JsonPreviewAction
                      iconOnly
                      title={t("profile.json.title", "Preview JSON")}
                      description={t(
                        "profile.json.description",
                        "Raw authenticated user payload returned by the backend."
                      )}
                      payloadTitle={t("profile.json.payload", "Backend payload")}
                      closeLabel={t("common.actions.close", "Close")}
                      value={user}
                    />
                    <DropdownMenu
                      align="end"
                      trigger={
                        <button
                          type="button"
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm font-medium text-[color:var(--color-ink)] shadow-sm transition hover:bg-[color:var(--color-interactive-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-focus)]"
                        >
                          {t("profile.actions.title", "Actions")}
                          <Icon
                            name="more-horizontal"
                            className="h-4 w-4 text-[color:var(--color-ink-muted)]"
                          />
                        </button>
                      }
                    >
                      <DropdownMenuItem
                        icon="pencil"
                        title={t("profile.actions.edit_profile", "Edit")}
                        onClick={() => setIsProfileDialogOpen(true)}
                      />
                      <DropdownMenuItem
                        icon="key-round"
                        title={t("profile.password.title", "Change password")}
                        onClick={() => setIsPasswordDialogOpen(true)}
                      />
                    </DropdownMenu>
                  </div>
                </div>
                <dl className="grid gap-3 md:grid-cols-2">
                  <ProfileDetail
                    label={t("common.form.first_name", "First name")}
                    value={user.firstName}
                  />
                  <ProfileDetail
                    label={t("common.form.last_name", "Last name")}
                    value={user.lastName}
                  />
                  <ProfileDetail label={t("profile.details.email", "Email")} value={user.email} />
                  <ProfileDetail
                    label={t("profile.roles.title", "Assigned roles")}
                    value={
                      roles.length > 0
                        ? roles.map((role) => formatRoleLabel(role.roleCode)).join(", ")
                        : "-"
                    }
                  />
                  <ProfileDetail
                    label={t("profile.metrics.permissions", "Permissions")}
                    value={String(permissions.length)}
                  />
                  <ProfileDetail
                    label={t("profile.details.created", "Created")}
                    value={formatDateTime(user.createdAt)}
                  />
                  <ProfileDetail
                    label={t("profile.details.updated", "Updated")}
                    value={formatDateTime(user.updatedAt)}
                  />
                </dl>
              </div>
            </Card>
          </section>

          <Dialog
            open={isProfileDialogOpen}
            onClose={() => setIsProfileDialogOpen(false)}
            closeVariant="icon"
            closeLabel={t("common.actions.close", "Close")}
            title={t("profile.edit.title", "Edit profile")}
            description={t(
              "profile.edit.description",
              "Update the name shown in the backoffice shell."
            )}
            width="md"
            variant="drawer"
          >
            <form action={submitProfile} className="grid gap-4">
              {profileState.ok ? (
                <FeedbackBanner
                  tone="success"
                  message={t("profile.edit.success", "Profile updated.")}
                />
              ) : null}
              {profileState.error ? <ErrorBanner message={profileState.error} /> : null}
              <Input
                label={t("common.form.first_name", "First name")}
                name="firstName"
                defaultValue={user.firstName}
                autoComplete="given-name"
                required
              />
              <Input
                label={t("common.form.last_name", "Last name")}
                name="lastName"
                defaultValue={user.lastName}
                autoComplete="family-name"
                required
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsProfileDialogOpen(false)}
                >
                  {t("common.actions.cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={isProfilePending}>
                  {isProfilePending
                    ? t("common.actions.updating")
                    : t("profile.edit.submit", "Save profile")}
                </Button>
              </div>
            </form>
          </Dialog>

          <Dialog
            open={isPasswordDialogOpen}
            onClose={() => setIsPasswordDialogOpen(false)}
            closeVariant="icon"
            closeLabel={t("common.actions.close", "Close")}
            title={t("profile.password.title", "Change password")}
            description={t(
              "profile.password.description",
              "Confirm your current password before setting a new one."
            )}
            width="md"
            variant="drawer"
          >
            <form action={submitPassword} className="grid gap-4">
              {passwordState.ok ? (
                <FeedbackBanner
                  tone="success"
                  message={t("profile.password.success", "Password changed.")}
                />
              ) : null}
              {passwordState.error ? <ErrorBanner message={passwordState.error} /> : null}
              <Input
                label={t("profile.password.current", "Current password")}
                name="currentPassword"
                type="password"
                autoComplete="current-password"
              />
              <Input
                label={t("profile.password.new", "New password")}
                name="newPassword"
                type="password"
                autoComplete="new-password"
                hint={t("profile.password.hint", "Use at least 12 characters.")}
              />
              <Input
                label={t("profile.password.confirm", "Confirm new password")}
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsPasswordDialogOpen(false)}
                >
                  {t("common.actions.cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={isPasswordPending}>
                  {isPasswordPending
                    ? t("common.actions.updating")
                    : t("profile.password.submit", "Change password")}
                </Button>
              </div>
            </form>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/75 p-4 shadow-sm backdrop-blur">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
        {label}
      </p>
      <p className="mt-2 truncate text-xl font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
        {value}
      </p>
    </div>
  );
}

function ProfileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-4 py-3">
      <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
        {label}
      </dt>
      <dd className="mt-1 break-all text-sm font-medium text-[color:var(--color-ink)]">{value}</dd>
    </div>
  );
}

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+|@/g).filter(Boolean);
  return `${parts[0]?.[0] ?? "U"}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function formatRoleLabel(roleCode: string): string {
  return roleCode
    .trim()
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
