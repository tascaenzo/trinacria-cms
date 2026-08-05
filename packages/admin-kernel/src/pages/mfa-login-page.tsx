import {
  Button,
  Checkbox,
  ErrorBanner,
  FieldDescription,
  FieldGroup,
  Input,
  Panel
} from "@trinacria-cms/trinacria-ui";
import { useEffect, useState } from "react";
import { MfaEnrollmentWizard } from "../components/mfa-enrollment-wizard.js";
import { useI18n } from "../lib/i18n.js";
import { downloadMfaRecoveryCodes, printMfaRecoveryCodes } from "../lib/mfa-recovery-codes.js";

export interface MfaLoginPageProps {
  mode: "verify" | "enroll";
  setup?: { manualKey: string; otpauthUrl: string; expiresAt: string } | null;
  isSubmitting: boolean;
  error: string | null;
  action: (formData: FormData) => void;
  onCancel: () => void;
}

/** Second step of password login: verifies TOTP or guides mandatory enrollment. */
export function MfaLoginPage({
  mode,
  setup,
  isSubmitting,
  error,
  action,
  onCancel
}: MfaLoginPageProps) {
  const { t } = useI18n();
  useEffect(() => {
    document.documentElement.classList.add("auth-page");
    return () => document.documentElement.classList.remove("auth-page");
  }, []);

  const isEnrollment = mode === "enroll";
  return (
    <div className="min-h-svh bg-[color:var(--color-panel-soft)]">
      <div className="mx-auto flex min-h-svh w-full max-w-5xl items-center justify-center px-4 py-8 sm:px-6 md:px-8 md:py-12">
        <section className="w-full max-w-md md:max-w-[430px]">
          <Panel className="space-y-6 p-6 shadow-[var(--shadow-overlay)] sm:p-8" radius="xl">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
                {t("auth.mfa.recovery.progress", "Step 4 of 4")}
              </p>
              <h2 className="text-3xl font-semibold text-[color:var(--color-ink-soft)]">
                {isEnrollment
                  ? t("auth.mfa.enroll.title", "Secure your account")
                  : t("auth.mfa.verify.title", "Two-factor authentication")}
              </h2>
              <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
                {isEnrollment
                  ? t(
                      "auth.mfa.enroll.summary",
                      "Your administrator requires two-factor authentication. Add this account to your authenticator app, then enter its code."
                    )
                  : t(
                      "auth.mfa.verify.summary",
                      "Enter the code from your authenticator app or a recovery code."
                    )}
              </p>
            </div>

            {isEnrollment && !setup ? (
              <FieldDescription>
                {t("auth.mfa.enroll.loading", "Preparing secure enrollment…")}
              </FieldDescription>
            ) : null}
            {isEnrollment && setup ? (
              <MfaEnrollmentWizard
                setup={setup}
                action={action}
                error={error}
                isSubmitting={isSubmitting}
                onCancel={onCancel}
              />
            ) : null}

            {!isEnrollment ? (
              <form action={action}>
                <FieldGroup className="gap-5">
                  <Input
                    name="code"
                    label={t("auth.mfa.code_label", "Authentication code")}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    placeholder="123456"
                    required
                    disabled={isEnrollment && !setup}
                    aria-describedby={error ? "mfa-form-error" : undefined}
                    aria-invalid={Boolean(error)}
                  />
                  {error ? <ErrorBanner id="mfa-form-error" message={error} /> : null}
                  <Button
                    type="submit"
                    disabled={isSubmitting || (isEnrollment && !setup)}
                    className="h-11 w-full rounded-sm text-sm font-semibold"
                  >
                    {isSubmitting
                      ? t("auth.mfa.submitting", "Verifying…")
                      : isEnrollment
                        ? t("auth.mfa.enroll.submit", "Enable two-factor authentication")
                        : t("auth.mfa.verify.submit", "Verify and sign in")}
                  </Button>
                  <Button type="button" variant="secondary" onClick={onCancel}>
                    {t("common.actions.cancel", "Cancel")}
                  </Button>
                </FieldGroup>
              </form>
            ) : null}
          </Panel>
        </section>
      </div>
    </div>
  );
}

export function MfaRecoveryCodesPage({
  recoveryCodes,
  onContinue
}: {
  recoveryCodes: readonly string[];
  onContinue: () => void;
}) {
  const { t } = useI18n();
  const [hasSavedRecoveryCodes, setHasSavedRecoveryCodes] = useState(false);
  return (
    <div className="min-h-svh bg-[color:var(--color-panel-soft)]">
      <div className="mx-auto flex min-h-svh w-full max-w-5xl items-center justify-center px-4 py-8 sm:px-6 md:px-8 md:py-12">
        <section className="w-full max-w-md md:max-w-[430px]">
          <Panel className="space-y-6 p-6 shadow-[var(--shadow-overlay)] sm:p-8" radius="xl">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold text-[color:var(--color-ink-soft)]">
                {t("auth.mfa.recovery.title", "Save your recovery codes")}
              </h2>
              <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
                {t(
                  "auth.mfa.recovery.summary",
                  "Each code works once. Store them somewhere safe; they are not shown again."
                )}
              </p>
            </div>
            <Panel
              className="grid grid-cols-2 gap-2 p-4 font-mono text-sm text-[color:var(--color-ink)]"
              tone="soft"
            >
              {recoveryCodes.map((code) => (
                <code key={code}>{code}</code>
              ))}
            </Panel>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => downloadMfaRecoveryCodes(recoveryCodes)}
              >
                {t("auth.mfa.recovery.download", "Download recovery codes (.txt)")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => printMfaRecoveryCodes(recoveryCodes)}
              >
                {t("auth.mfa.recovery.print", "Print recovery codes")}
              </Button>
            </div>
            <Checkbox
              checked={hasSavedRecoveryCodes}
              onChange={(event) => setHasSavedRecoveryCodes(event.currentTarget.checked)}
              label={t(
                "auth.mfa.recovery.confirm_label",
                "I have saved these recovery codes in a safe place"
              )}
              description={t(
                "auth.mfa.recovery.confirm_description",
                "You must confirm this before continuing to the backoffice."
              )}
            />
            <Button
              type="button"
              disabled={!hasSavedRecoveryCodes}
              className="h-11 w-full rounded-sm text-sm font-semibold"
              onClick={onContinue}
            >
              {t("auth.mfa.recovery.continue", "I saved my recovery codes")}
            </Button>
          </Panel>
        </section>
      </div>
    </div>
  );
}
