import type {
  BeginMfaEnrollmentResponse,
  GetAuthenticatedUserResponse,
  GetMfaStatusResponse,
  ListUserEffectivePermissionsResponse,
  ListUserRolesResponse
} from "@trinacria-cms/sdk";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  DropdownMenu,
  DropdownMenuItem,
  Icon,
  Input,
  Panel,
  PropertyItem,
  PropertyList,
  Select,
  useToast
} from "@trinacria-cms/trinacria-ui";
import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { JsonPreviewAction } from "../components/json-preview-action.js";
import {
  MfaEnrollmentActions,
  type MfaEnrollmentStep,
  MfaEnrollmentWizard
} from "../components/mfa-enrollment-wizard.js";
import { EmptyState, ErrorBanner } from "../components/resource-feedback.js";
import { normalizeLocale } from "../lib/auth-i18n.js";
import { formatDateTime } from "../lib/formatting.js";
import { useI18n } from "../lib/i18n.js";
import { downloadMfaRecoveryCodes, printMfaRecoveryCodes } from "../lib/mfa-recovery-codes.js";
import { toDisplayError } from "../lib/sdk-errors.js";
import { translateStatusLabel } from "../lib/ui-translations.js";
import { formatUserName } from "../lib/user-formatting.js";
import {
  type AsyncActionState,
  createIdleAsyncActionState,
  readRequiredString
} from "../runtime/action-state.js";
import { cms } from "../runtime/cms-sdk.js";

type ProfileUser = GetAuthenticatedUserResponse["data"];
type ProfileRole = ListUserRolesResponse["data"][number];
type ProfilePermissions = ListUserEffectivePermissionsResponse["data"];
type MfaStatus = GetMfaStatusResponse["data"];
type MfaEnrollmentSetup = BeginMfaEnrollmentResponse["data"];

export function ProfilePage() {
  const { locale, setLocale, t } = useI18n();
  const { pushToast } = useToast();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [roles, setRoles] = useState<readonly ProfileRole[]>([]);
  const [permissions, setPermissions] = useState<ProfilePermissions>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [mfaSetup, setMfaSetup] = useState<MfaEnrollmentSetup | null>(null);
  const [mfaEnrollmentStep, setMfaEnrollmentStep] = useState<MfaEnrollmentStep>(1);
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<readonly string[] | null>(null);
  const [hasSavedRecoveryCodes, setHasSavedRecoveryCodes] = useState(false);
  const [mfaDialogError, setMfaDialogError] = useState<string | null>(null);
  const [isMfaDisableDialogOpen, setIsMfaDisableDialogOpen] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const currentUser = await cms.auth.getAuthenticatedUser();
      const [userRoles, effectivePermissions, currentMfaStatus] = await Promise.all([
        cms.security.listUserRoles({ path: { id: currentUser.data.id } }),
        cms.security.listUserEffectivePermissions({ path: { id: currentUser.data.id } }),
        cms.auth.getMfaStatus()
      ]);
      setUser(currentUser.data);
      setRoles(userRoles.data);
      setPermissions(effectivePermissions.data);
      setMfaStatus(currentMfaStatus.data);
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
            lastName: readRequiredString(formData, "lastName"),
            locale: normalizeLocale(readRequiredString(formData, "locale"))
          }
        });
        setUser(response.data);
        setLocale(normalizeLocale(response.data.locale ?? locale));
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
  const [mfaConfirmState, submitMfaConfirmation, isMfaConfirmPending] = useActionState(
    async (_previousState: AsyncActionState, formData: FormData) => {
      try {
        const response = await cms.auth.confirmMfaEnrollment({
          body: { code: readRequiredString(formData, "code") }
        });
        setMfaRecoveryCodes(response.data.recoveryCodes);
        setHasSavedRecoveryCodes(false);
        setMfaStatus((previous) => (previous ? { ...previous, enabled: true } : previous));
        return { ok: true, error: null, data: null };
      } catch (currentError) {
        return { ok: false, error: toDisplayError(currentError), data: null };
      }
    },
    createIdleAsyncActionState()
  );
  const [mfaDisableState, submitMfaDisable, isMfaDisablePending] = useActionState(
    async (_previousState: AsyncActionState, formData: FormData) => {
      try {
        await cms.auth.disableMfa({
          body: {
            currentPassword: readRequiredString(formData, "currentPassword"),
            code: readRequiredString(formData, "code")
          }
        });
        setMfaStatus((previous) => (previous ? { ...previous, enabled: false } : previous));
        return { ok: true, error: null, data: null };
      } catch (currentError) {
        return { ok: false, error: toDisplayError(currentError), data: null };
      }
    },
    createIdleAsyncActionState()
  );

  useEffect(() => {
    if (profileState.ok) {
      pushToast({
        tone: "success",
        title: t("profile.edit.title", "Profilo"),
        description: t("profile.edit.success", "Profilo aggiornato."),
        duration: 4000
      });
    } else if (profileState.error) {
      pushToast({
        tone: "danger",
        title: t("common.feedback.save_error", "Salvataggio non riuscito"),
        description: profileState.error,
        duration: 0
      });
    }
  }, [profileState, pushToast, t]);

  useEffect(() => {
    if (passwordState.ok) {
      pushToast({
        tone: "success",
        title: t("profile.password.title", "Password"),
        description: t("profile.password.success", "Password modificata."),
        duration: 4000
      });
    } else if (passwordState.error) {
      pushToast({
        tone: "danger",
        title: t("common.feedback.save_error", "Salvataggio non riuscito"),
        description: passwordState.error,
        duration: 0
      });
    }
  }, [passwordState, pushToast, t]);

  useEffect(() => {
    if (mfaConfirmState.ok) {
      pushToast({
        tone: "success",
        title: t("profile.mfa.title", "Sicurezza account"),
        description: t("profile.mfa.enable_success", "Autenticazione a due fattori attivata."),
        duration: 4000
      });
    } else if (mfaConfirmState.error) {
      pushToast({
        tone: "danger",
        title: t("common.feedback.save_error", "Salvataggio non riuscito"),
        description: mfaConfirmState.error,
        duration: 0
      });
    }
  }, [mfaConfirmState, pushToast, t]);

  useEffect(() => {
    if (mfaDisableState.ok) {
      pushToast({
        tone: "success",
        title: t("profile.mfa.title", "Sicurezza account"),
        description: t("profile.mfa.disabled_success", "Autenticazione a due fattori disattivata."),
        duration: 4000
      });
    } else if (mfaDisableState.error) {
      pushToast({
        tone: "danger",
        title: t("common.feedback.save_error", "Salvataggio non riuscito"),
        description: mfaDisableState.error,
        duration: 0
      });
    }
  }, [mfaDisableState, pushToast, t]);

  const beginMfaEnrollment = useCallback(async () => {
    setMfaDialogError(null);
    setMfaEnrollmentStep(1);
    try {
      const response = await cms.auth.beginMfaEnrollment();
      setMfaSetup(response.data);
      setMfaRecoveryCodes(null);
    } catch (currentError) {
      const message = toDisplayError(currentError);
      setMfaDialogError(message);
      pushToast({
        tone: "danger",
        title: t("profile.mfa.title", "Sicurezza account"),
        description: message,
        duration: 0
      });
    }
  }, [pushToast, t]);

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
                        <Button type="button" variant="secondary">
                          {t("profile.actions.title", "Actions")}
                          <Icon
                            name="more-horizontal"
                            className="h-4 w-4 text-[color:var(--color-ink-muted)]"
                          />
                        </Button>
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
                <PropertyList columns={2}>
                  <PropertyItem
                    label={t("common.form.first_name", "First name")}
                    value={user.firstName}
                  />
                  <PropertyItem
                    label={t("common.form.last_name", "Last name")}
                    value={user.lastName}
                  />
                  <PropertyItem label={t("profile.details.email", "Email")} value={user.email} />
                  <PropertyItem
                    label={t("profile.details.language", "Lingua")}
                    value={
                      user.locale === "it"
                        ? t("profile.language.italian", "Italiano")
                        : t("profile.language.english", "English")
                    }
                  />
                  <PropertyItem
                    label={t("profile.roles.title", "Assigned roles")}
                    value={
                      roles.length > 0
                        ? roles.map((role) => formatRoleLabel(role.roleCode)).join(", ")
                        : "-"
                    }
                  />
                  <PropertyItem
                    label={t("profile.metrics.permissions", "Permissions")}
                    value={String(permissions.length)}
                  />
                  <PropertyItem
                    label={t("profile.details.created", "Created")}
                    value={formatDateTime(user.createdAt)}
                  />
                  <PropertyItem
                    label={t("profile.details.updated", "Updated")}
                    value={formatDateTime(user.updatedAt)}
                  />
                </PropertyList>
              </div>
            </Card>
          </section>

          <section>
            <Card
              eyebrow={t("profile.mfa.eyebrow", "Account security")}
              title={t("profile.mfa.title", "Two-factor authentication")}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[color:var(--color-ink-muted)]">
                    {mfaStatus?.mode === "disabled"
                      ? t(
                          "profile.mfa.disabled",
                          "Two-factor authentication is currently disabled by your administrator."
                        )
                      : mfaStatus?.enabled
                        ? t(
                            "profile.mfa.enabled",
                            "Your account is protected with an authenticator app."
                          )
                        : mfaStatus?.mode === "required"
                          ? t(
                              "profile.mfa.required",
                              "Two-factor authentication is required. Set it up before your next login."
                            )
                          : t(
                              "profile.mfa.optional",
                              "Add an authenticator app for stronger account protection."
                            )}
                  </p>
                  {mfaStatus?.enabled && mfaStatus.mode === "required" ? (
                    <p className="text-sm font-medium text-[color:var(--color-ink-muted)]">
                      {t(
                        "profile.mfa.required_cannot_disable",
                        "This factor cannot be disabled while the administrator requires 2FA."
                      )}
                    </p>
                  ) : null}
                  {mfaStatus?.enabledAt ? (
                    <p className="text-sm text-[color:var(--color-ink-muted)]">
                      {t("profile.mfa.enabled_since", "Enabled on")}{" "}
                      {formatDateTime(mfaStatus.enabledAt)} · {mfaStatus.recoveryCodesRemaining}{" "}
                      {t("profile.mfa.recovery_remaining", "recovery codes remaining")}
                    </p>
                  ) : null}
                  <Badge tone={mfaStatus?.enabled ? "success" : "warning"}>
                    {mfaStatus?.enabled
                      ? t("profile.mfa.status.enabled", "Enabled")
                      : t("profile.mfa.status.not_enabled", "Not enabled")}
                  </Badge>
                </div>
                {mfaStatus?.mode !== "disabled" && !mfaStatus?.enabled ? (
                  <Button type="button" onClick={() => void beginMfaEnrollment()}>
                    {t("profile.mfa.enable", "Enable 2FA")}
                  </Button>
                ) : null}
                {mfaStatus?.enabled && mfaStatus.mode !== "required" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsMfaDisableDialogOpen(true)}
                  >
                    {t("profile.mfa.disable", "Disable 2FA")}
                  </Button>
                ) : null}
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
              <Select
                label={t("profile.language.label", "Lingua backoffice")}
                name="locale"
                defaultValue={user.locale ?? normalizeLocale(locale)}
              >
                <option value="it">{t("profile.language.italian", "Italiano")}</option>
                <option value="en">{t("profile.language.english", "English")}</option>
              </Select>
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
                    ? t("common.actions.saving", "Salvataggio...")
                    : t("common.actions.save", "Salva")}
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
                    ? t("common.actions.saving", "Salvataggio...")
                    : t("common.actions.save", "Salva")}
                </Button>
              </div>
            </form>
          </Dialog>

          <Dialog
            open={mfaSetup !== null && !mfaStatus?.enabled}
            onClose={() => {
              setMfaEnrollmentStep(1);
              setMfaSetup(null);
            }}
            closeVariant="icon"
            closeLabel={t("common.actions.close", "Close")}
            title={t("profile.mfa.setup.title", "Set up two-factor authentication")}
            description={t(
              "profile.mfa.setup.description",
              "Add the key to your authenticator app, then confirm the generated code."
            )}
            width="md"
            variant="drawer"
            footer={
              <MfaEnrollmentActions
                step={mfaEnrollmentStep}
                isSubmitting={isMfaConfirmPending}
                onCancel={() => {
                  setMfaEnrollmentStep(1);
                  setMfaSetup(null);
                }}
                onStepChange={setMfaEnrollmentStep}
                confirmationFormId="profile-mfa-confirmation"
              />
            }
          >
            {mfaSetup ? (
              <MfaEnrollmentWizard
                setup={mfaSetup}
                action={submitMfaConfirmation}
                error={mfaDialogError ?? mfaConfirmState.error}
                isSubmitting={isMfaConfirmPending}
                onCancel={() => {
                  setMfaEnrollmentStep(1);
                  setMfaSetup(null);
                }}
                step={mfaEnrollmentStep}
                onStepChange={setMfaEnrollmentStep}
                showActions={false}
                confirmationFormId="profile-mfa-confirmation"
              />
            ) : null}
          </Dialog>

          <Dialog
            open={Boolean(mfaRecoveryCodes)}
            onClose={() => {
              if (hasSavedRecoveryCodes) setMfaRecoveryCodes(null);
            }}
            closeVariant="icon"
            closeLabel={t("common.actions.close", "Close")}
            title={t("profile.mfa.recovery.title", "Save your recovery codes")}
            description={t(
              "profile.mfa.recovery.description",
              "Each code works once and will not be shown again."
            )}
            width="md"
            variant="drawer"
          >
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
              {t("auth.mfa.recovery.progress", "Step 4 of 4")}
            </p>
            <Panel className="grid grid-cols-2 gap-2 p-4 font-mono text-sm" tone="soft">
              {mfaRecoveryCodes?.map((code) => (
                <code key={code}>{code}</code>
              ))}
            </Panel>
            {mfaRecoveryCodes ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => downloadMfaRecoveryCodes(mfaRecoveryCodes)}
                >
                  {t("auth.mfa.recovery.download", "Download recovery codes (.txt)")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => printMfaRecoveryCodes(mfaRecoveryCodes)}
                >
                  {t("auth.mfa.recovery.print", "Print recovery codes")}
                </Button>
              </div>
            ) : null}
            <Checkbox
              checked={hasSavedRecoveryCodes}
              onChange={(event) => setHasSavedRecoveryCodes(event.currentTarget.checked)}
              className="mt-4"
              label={t(
                "auth.mfa.recovery.confirm_label",
                "I have saved these recovery codes in a safe place"
              )}
              description={t(
                "auth.mfa.recovery.confirm_description",
                "You must confirm this before continuing to the backoffice."
              )}
            />
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                disabled={!hasSavedRecoveryCodes}
                onClick={() => setMfaRecoveryCodes(null)}
              >
                {t("common.actions.continue", "Continue")}
              </Button>
            </div>
          </Dialog>

          <Dialog
            open={isMfaDisableDialogOpen}
            onClose={() => setIsMfaDisableDialogOpen(false)}
            closeVariant="icon"
            closeLabel={t("common.actions.close", "Close")}
            title={t("profile.mfa.disable", "Disable 2FA")}
            description={t(
              "profile.mfa.disable_description",
              "Confirm your password and a current authenticator or recovery code."
            )}
            width="md"
            variant="drawer"
          >
            <form action={submitMfaDisable} className="grid gap-4">
              {mfaDisableState.error ? <ErrorBanner message={mfaDisableState.error} /> : null}
              <Input
                label={t("profile.password.current", "Current password")}
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
              <Input
                label={t("profile.mfa.code", "Authentication code")}
                name="code"
                autoComplete="one-time-code"
                required
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsMfaDisableDialogOpen(false)}
                >
                  {t("common.actions.cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={isMfaDisablePending}>
                  {isMfaDisablePending
                    ? t("common.actions.updating")
                    : t("profile.mfa.disable", "Disable 2FA")}
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
    <Panel
      className="rounded-2xl bg-[color:var(--color-surface)]/75 p-4 backdrop-blur"
      elevation="sm"
      tone="custom"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
        {label}
      </p>
      <p className="mt-2 truncate text-xl font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
        {value}
      </p>
    </Panel>
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
