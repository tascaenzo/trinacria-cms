import { Button, FieldDescription, FieldGroup, Input } from "@trinacria-cms/trinacria-ui";
import { type ReactNode, useState } from "react";
import { useI18n } from "../lib/i18n.js";
import { MfaQrCode } from "./mfa-qr-code.js";

export interface MfaEnrollmentWizardProps {
  setup: { manualKey: string; otpauthUrl: string; expiresAt: string };
  isSubmitting: boolean;
  error: string | null;
  action: (formData: FormData) => void;
  onCancel: () => void;
  step?: MfaEnrollmentStep;
  onStepChange?: (step: MfaEnrollmentStep) => void;
  showActions?: boolean;
  confirmationFormId?: string;
}

export type MfaEnrollmentStep = 1 | 2 | 3;

export interface MfaEnrollmentActionsProps {
  step: MfaEnrollmentStep;
  isSubmitting: boolean;
  onCancel: () => void;
  onStepChange: (step: MfaEnrollmentStep) => void;
  confirmationFormId?: string;
}

/** Guided TOTP enrollment shared by profile settings and mandatory login. */
export function MfaEnrollmentWizard({
  setup,
  isSubmitting,
  error,
  action,
  onCancel,
  step: controlledStep,
  onStepChange,
  showActions = true,
  confirmationFormId
}: MfaEnrollmentWizardProps) {
  const { t } = useI18n();
  const [uncontrolledStep, setUncontrolledStep] = useState<MfaEnrollmentStep>(1);
  const [isManualKeyVisible, setIsManualKeyVisible] = useState(false);
  const step = controlledStep ?? uncontrolledStep;

  function setStep(nextStep: MfaEnrollmentStep) {
    if (controlledStep === undefined) setUncontrolledStep(nextStep);
    onStepChange?.(nextStep);
  }

  return (
    <div className="grid gap-5">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
        {t("auth.mfa.setup.progress", "Step")} {step} {t("auth.mfa.setup.progress_total", "of 3")}
      </p>

      {step === 1 ? (
        <EnrollmentStep
          title={t("auth.mfa.setup.step1.title", "Open your authenticator app")}
          firstLine={t(
            "auth.mfa.setup.step1.line1",
            "Use Google Authenticator, 1Password, Authy, or another compatible app."
          )}
          secondLine={t(
            "auth.mfa.setup.step1.line2",
            "Choose the option to add a new account before continuing."
          )}
        >
          {showActions ? (
            <MfaEnrollmentActions
              step={step}
              isSubmitting={isSubmitting}
              onCancel={onCancel}
              onStepChange={setStep}
              confirmationFormId={confirmationFormId}
            />
          ) : null}
        </EnrollmentStep>
      ) : null}

      {step === 2 ? (
        <EnrollmentStep
          title={t("auth.mfa.setup.step2.title", "Scan the QR code")}
          firstLine={t(
            "auth.mfa.setup.step2.line1",
            "In your authenticator app, scan this code to add your Trinacria CMS account."
          )}
          secondLine={t(
            "auth.mfa.setup.step2.line2",
            "If scanning is unavailable, use the manual key shown below."
          )}
        >
          <div className="flex justify-center">
            <MfaQrCode
              otpauthUrl={setup.otpauthUrl}
              alt={t("auth.mfa.enroll.qr_alt", "QR code for authenticator setup")}
            />
          </div>
          {!isManualKeyVisible ? (
            <Button type="button" variant="secondary" onClick={() => setIsManualKeyVisible(true)}>
              {t("auth.mfa.setup.show_manual", "Can't scan the QR code?")}
            </Button>
          ) : (
            <div className="rounded-[var(--radius-control)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-3">
              <p className="text-xs font-medium text-[color:var(--color-ink-muted)]">
                {t("auth.mfa.enroll.manual_label", "Manual setup key")}
              </p>
              <code className="mt-2 block break-all text-sm text-[color:var(--color-ink)]">
                {setup.manualKey}
              </code>
            </div>
          )}
          {showActions ? (
            <MfaEnrollmentActions
              step={step}
              isSubmitting={isSubmitting}
              onCancel={onCancel}
              onStepChange={setStep}
              confirmationFormId={confirmationFormId}
            />
          ) : null}
        </EnrollmentStep>
      ) : null}

      {step === 3 ? (
        <EnrollmentStep
          title={t("auth.mfa.setup.step3.title", "Confirm the generated code")}
          firstLine={t(
            "auth.mfa.setup.step3.line1",
            "Your authenticator app now shows a six-digit code that changes every few seconds."
          )}
          secondLine={t(
            "auth.mfa.setup.step3.line2",
            "Enter the current code to finish activation and receive recovery codes."
          )}
        >
          <form id={confirmationFormId} action={action}>
            <FieldGroup className="gap-4">
              {error ? (
                <FieldDescription
                  role="alert"
                  className="rounded-[var(--radius-control)] border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] px-4 py-3 text-[color:var(--color-danger-ink)]"
                >
                  {error}
                </FieldDescription>
              ) : null}
              <Input
                name="code"
                label={t("auth.mfa.code_label", "Authentication code")}
                autoComplete="one-time-code"
                inputMode="numeric"
                placeholder="123456"
                required
              />
              {showActions ? (
                <MfaEnrollmentActions
                  step={step}
                  isSubmitting={isSubmitting}
                  onCancel={onCancel}
                  onStepChange={setStep}
                  confirmationFormId={confirmationFormId}
                />
              ) : null}
            </FieldGroup>
          </form>
        </EnrollmentStep>
      ) : null}
    </div>
  );
}

/** Standard wizard controls; suitable for either inline content or a Dialog footer. */
export function MfaEnrollmentActions({
  step,
  isSubmitting,
  onCancel,
  onStepChange,
  confirmationFormId
}: MfaEnrollmentActionsProps) {
  const { t } = useI18n();

  if (step === 1) {
    return (
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("common.actions.cancel", "Cancel")}
        </Button>
        <Button type="button" onClick={() => onStepChange(2)}>
          {t("common.actions.continue", "Continue")}
        </Button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => onStepChange(1)}>
          {t("common.actions.back", "Back")}
        </Button>
        <Button type="button" onClick={() => onStepChange(3)}>
          {t("common.actions.continue", "Continue")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="secondary" onClick={() => onStepChange(2)}>
        {t("common.actions.back", "Back")}
      </Button>
      <Button type="submit" form={confirmationFormId} disabled={isSubmitting}>
        {isSubmitting
          ? t("auth.mfa.submitting", "Verifying…")
          : t("profile.mfa.confirm", "Confirm")}
      </Button>
    </div>
  );
}

function EnrollmentStep({
  title,
  firstLine,
  secondLine,
  children
}: {
  title: string;
  firstLine: string;
  secondLine: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4">
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold text-[color:var(--color-ink)]">{title}</h3>
        <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">{firstLine}</p>
        <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">{secondLine}</p>
      </div>
      {children}
    </section>
  );
}
