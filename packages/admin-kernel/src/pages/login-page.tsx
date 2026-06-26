import { useEffect, useState } from "react";
import { Button, FieldDescription, FieldGroup, Input } from "@trinacria-cms/trinacria-ui";
import { useI18n } from "../lib/i18n.js";

export interface LoginPageProps {
  isSubmitting: boolean;
  state: {
    error: string | null;
  };
  action: (formData: FormData) => void;
}

export function LoginPage({ action, isSubmitting, state }: LoginPageProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    document.documentElement.classList.add("auth-page");
    return () => {
      document.documentElement.classList.remove("auth-page");
    };
  }, []);

  const hasError = Boolean(state.error);

  return (
    <div className="min-h-svh bg-[color:var(--color-panel-soft)]">
      <div className="mx-auto flex min-h-svh w-full max-w-5xl items-center justify-center px-4 py-8 sm:px-6 md:px-8 md:py-12">
        <section className="w-full max-w-md md:max-w-[430px]">
          <div className="space-y-6 md:rounded-[var(--radius-overlay)] md:border md:border-[color:var(--color-border)] md:bg-[color:var(--color-surface)] md:p-8 md:shadow-[var(--shadow-overlay)]">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold text-[color:var(--color-ink-soft)]">
                  {t("auth.login.title")}
                </h2>

                <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
                  {t("auth.login.summary")}
                </p>
              </div>

              <form action={action}>
                <FieldGroup className="gap-5">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    label={t("auth.login.email_label")}
                    placeholder={t("auth.login.email_placeholder")}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    aria-describedby={hasError ? "login-form-error" : undefined}
                    aria-invalid={hasError}
                    className={
                      hasError
                        ? "border-[color:var(--color-danger-border)] focus:border-[color:var(--color-danger-ink)] focus:ring-[color:var(--color-danger-border)]"
                        : undefined
                    }
                    required
                  />

                  <Input
                    id="password"
                    name="password"
                    type="password"
                    label={t("auth.login.password_label")}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    aria-describedby={hasError ? "login-form-error" : undefined}
                    aria-invalid={hasError}
                    className={
                      hasError
                        ? "border-[color:var(--color-danger-border)] focus:border-[color:var(--color-danger-ink)] focus:ring-[color:var(--color-danger-border)]"
                        : undefined
                    }
                    required
                  />

                  {hasError ? (
                    <FieldDescription
                      id="login-form-error"
                      role="alert"
                      aria-live="polite"
                      className="rounded-[var(--radius-control)] border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] px-4 py-3 text-[color:var(--color-danger-ink)]"
                    >
                      {state.error}
                    </FieldDescription>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-11 w-full rounded-sm text-sm font-semibold"
                  >
                    {isSubmitting ? t("auth.login.submitting") : t("auth.login.submit")}
                  </Button>

                  <FieldDescription className="text-center text-sm">
                    {t("auth.login.helper")}
                  </FieldDescription>
                </FieldGroup>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
