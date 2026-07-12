import { startTransition, type FormEvent, type MouseEvent, useRef, useState } from "react";
import { Button, Input, Select } from "@trinacria-cms/trinacria-ui";
import { AuthScreenLayout } from "../components/auth-screen-layout.js";
import { useI18n } from "../lib/i18n.js";

export interface InstallationBootstrapPageProps {
  isSubmitting: boolean;
  state: {
    error: string | null;
  };
  action: (formData: FormData) => void;
}

type Step = "site" | "admin" | "review";
type FormValues = {
  siteName: string;
  siteTagline: string;
  locale: string;
  timezone: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const STEPS: Step[] = ["site", "admin", "review"];

const LOCALE_OPTIONS = [
  { value: "en-US", label: "English (US)" },
  { value: "it-IT", label: "Italiano" },
  { value: "fr-FR", label: "Français" },
  { value: "de-DE", label: "Deutsch" },
  { value: "es-ES", label: "Español" }
];

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC" },
  { value: "Europe/Rome", label: "Europe/Rome" },
  { value: "Europe/Paris", label: "Europe/Paris" },
  { value: "Europe/Berlin", label: "Europe/Berlin" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Europe/Madrid", label: "Europe/Madrid" },
  { value: "America/New_York", label: "America/New_York" },
  { value: "America/Chicago", label: "America/Chicago" },
  { value: "America/Denver", label: "America/Denver" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata" }
];

function getStepIndex(step: Step): number {
  return STEPS.indexOf(step);
}

export function InstallationBootstrapPage({
  action,
  isSubmitting,
  state
}: InstallationBootstrapPageProps) {
  const { t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const [currentStep, setCurrentStep] = useState<Step>("site");
  const [localError, setLocalError] = useState<string | null>(null);
  const [values, setValues] = useState<FormValues>({
    siteName: "",
    siteTagline: "",
    locale: "en-US",
    timezone: "UTC",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const stepIndex = getStepIndex(currentStep);
  const isFirstStep = currentStep === "site";
  const isReviewStep = currentStep === "review";

  function validateCurrentStep() {
    if (!formRef.current?.reportValidity()) {
      return false;
    }
    if (currentStep === "admin" && values.password !== values.confirmPassword) {
      setLocalError(t("auth.installation.error.password_mismatch"));
      return false;
    }
    setLocalError(null);
    return true;
  }

  function validateAllSteps() {
    if (
      !values.siteName.trim() ||
      !values.firstName.trim() ||
      !values.lastName.trim() ||
      !values.email.trim() ||
      !values.password ||
      !values.confirmPassword
    ) {
      setLocalError(t("auth.installation.error.required_fields"));
      return false;
    }
    if (values.password !== values.confirmPassword) {
      setLocalError(t("auth.installation.error.password_mismatch"));
      return false;
    }
    setLocalError(null);
    return true;
  }

  function handleContinue(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (!validateCurrentStep()) {
      return;
    }
    if (currentStep === "admin") {
      setCurrentStep("review");
    } else {
      const nextIndex = getStepIndex(currentStep) + 1;
      setCurrentStep(STEPS[nextIndex]);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateAllSteps()) {
      return;
    }

    const formData = new FormData();
    formData.set("siteName", values.siteName.trim());
    formData.set("siteTagline", values.siteTagline.trim());
    formData.set("locale", values.locale);
    formData.set("timezone", values.timezone);
    formData.set("firstName", values.firstName.trim());
    formData.set("lastName", values.lastName.trim());
    formData.set("email", values.email.trim());
    formData.set("password", values.password);
    formData.set("confirmPassword", values.confirmPassword);
    startTransition(() => action(formData));
  }

  function handleBack() {
    if (currentStep === "review") {
      setCurrentStep("admin");
    } else {
      const prevIndex = getStepIndex(currentStep) - 1;
      setCurrentStep(STEPS[prevIndex]);
    }
  }

  function setValue<K extends keyof FormValues>(key: K, next: FormValues[K]) {
    setValues((previous) => ({
      ...previous,
      [key]: next
    }));
  }

  function renderStepIndicator() {
    return (
      <div className="mb-6 flex items-center gap-2 text-xs font-medium text-[color:var(--color-ink-muted)]">
        {STEPS.slice(0, -1).map((step, i) => {
          const isActive = i === stepIndex;
          const isDone = i < stepIndex;
          return (
            <span key={step} className="flex items-center gap-2">
              {i > 0 && (
                <span
                  className={`h-px w-4 ${isDone ? "bg-[color:var(--color-accent)]" : "bg-[color:var(--color-border)]"}`}
                />
              )}
              <span
                className={
                  isActive
                    ? "text-[color:var(--color-accent)]"
                    : isDone
                      ? "text-[color:var(--color-accent)]"
                      : undefined
                }
              >
                {isDone ? "✓" : i + 1}{" "}
                <span className="hidden sm:inline">{t(`auth.installation.step_${step}`)}</span>
              </span>
            </span>
          );
        })}
      </div>
    );
  }

  function renderSiteStep() {
    return (
      <div className="grid gap-4">
        <Input
          label={t("auth.installation.site_name_label")}
          name="siteName"
          value={values.siteName}
          onChange={(event) => setValue("siteName", event.currentTarget.value)}
          placeholder={t("auth.installation.site_name_default")}
          required
        />
        <Input
          label={t("auth.installation.site_tagline_label")}
          name="siteTagline"
          value={values.siteTagline}
          onChange={(event) => setValue("siteTagline", event.currentTarget.value)}
          placeholder={t("auth.installation.site_tagline_default")}
        />
        <Select
          label={t("auth.installation.locale_label")}
          name="locale"
          value={values.locale}
          onChange={(event) => setValue("locale", event.currentTarget.value)}
        >
          {LOCALE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select
          label={t("auth.installation.timezone_label")}
          name="timezone"
          value={values.timezone}
          onChange={(event) => setValue("timezone", event.currentTarget.value)}
        >
          {TIMEZONE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>
    );
  }

  function renderAdminStep() {
    return (
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t("auth.installation.first_name_label")}
            name="firstName"
            value={values.firstName}
            onChange={(event) => setValue("firstName", event.currentTarget.value)}
            required
          />
          <Input
            label={t("auth.installation.last_name_label")}
            name="lastName"
            value={values.lastName}
            onChange={(event) => setValue("lastName", event.currentTarget.value)}
            required
          />
        </div>
        <Input
          label={t("auth.installation.email_label")}
          type="email"
          name="email"
          value={values.email}
          onChange={(event) => setValue("email", event.currentTarget.value)}
          autoComplete="email"
          required
        />
        <Input
          label={t("auth.installation.password_label")}
          type="password"
          name="password"
          value={values.password}
          onChange={(event) => setValue("password", event.currentTarget.value)}
          autoComplete="new-password"
          required
        />
        <Input
          label={t("auth.installation.confirm_password_label")}
          type="password"
          name="confirmPassword"
          value={values.confirmPassword}
          onChange={(event) => setValue("confirmPassword", event.currentTarget.value)}
          autoComplete="new-password"
          required
        />
      </div>
    );
  }

  function renderReviewStep() {
    return (
      <div className="grid gap-3 text-sm">
        <div>
          <p className="text-xs font-semibold text-[color:var(--color-ink-muted)] uppercase tracking-wide">
            {t("auth.installation.step_site")}
          </p>
          <p className="mt-1">{values.siteName}</p>
          {values.siteTagline && (
            <p className="text-[color:var(--color-ink-muted)]">{values.siteTagline}</p>
          )}
          <p className="text-[color:var(--color-ink-muted)]">
            {values.locale} — {values.timezone}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-[color:var(--color-ink-muted)] uppercase tracking-wide">
            {t("auth.installation.step_admin")}
          </p>
          <p className="mt-1">
            {values.firstName} {values.lastName}
          </p>
          <p className="text-[color:var(--color-ink-muted)]">{values.email}</p>
        </div>
      </div>
    );
  }

  return (
    <AuthScreenLayout
      variant="minimal"
      eyebrow={t("auth.installation.eyebrow")}
      heroTitle={t("auth.installation.hero_title")}
      heroBody={t("auth.installation.hero_body")}
      formTitle={t("auth.installation.form_title")}
      formSummary={t("auth.installation.form_summary")}
      formBadgeLabel={t("auth.installation.form_badge_label")}
      formBadgeHint={t("auth.installation.form_badge_hint")}
      heroMetrics={[]}
      heroHighlights={[]}
    >
      <form ref={formRef} className="grid gap-5" onSubmit={handleSubmit}>
        {renderStepIndicator()}

        {currentStep === "site" && renderSiteStep()}
        {currentStep === "admin" && renderAdminStep()}
        {currentStep === "review" && renderReviewStep()}

        {localError || state.error ? (
          <p
            role="alert"
            aria-live="polite"
            className="rounded-[var(--radius-control)] border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] px-4 py-3 text-sm text-[color:var(--color-danger-ink)]"
          >
            {localError ?? state.error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          {!isFirstStep ? (
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={handleBack}
              className="h-11 flex-1 rounded-sm text-sm font-semibold"
            >
              {t("auth.installation.back")}
            </Button>
          ) : (
            <div />
          )}

          {!isReviewStep ? (
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleContinue}
              className="h-11 flex-1 rounded-sm text-sm font-semibold"
            >
              {t("auth.installation.continue")}
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 flex-1 rounded-sm text-sm font-semibold"
            >
              {isSubmitting ? t("auth.installation.submitting") : t("auth.installation.submit")}
            </Button>
          )}
        </div>
      </form>
    </AuthScreenLayout>
  );
}
