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
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");

  useEffect(() => {
    document.documentElement.classList.add("auth-page");
    return () => {
      document.documentElement.classList.remove("auth-page");
    };
  }, []);

  const hasError = Boolean(state.error);

  return (
    <div className="min-h-svh bg-[radial-gradient(circle_at_top,#e2e8f0_0%,transparent_26%),linear-gradient(180deg,#f8fafc_0%,#ffffff_58%,#f8fafc_100%)]">
      <div className="mx-auto flex min-h-svh w-full max-w-5xl items-center justify-center px-4 py-8 sm:px-6 md:px-8 md:py-12">
        <section className="w-full max-w-md md:max-w-[430px]">
          <div className="space-y-6 md:rounded-[28px] md:border md:border-slate-200 md:bg-white md:p-8 md:shadow-[0_32px_96px_rgba(15,23,42,0.18)]">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950">
                  {t("auth.login.title")}
                </h2>

                <p className="text-sm leading-6 text-slate-600">{t("auth.login.summary")}</p>
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
                        ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
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
                        ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                        : undefined
                    }
                    required
                  />

                  {hasError ? (
                    <FieldDescription
                      id="login-form-error"
                      role="alert"
                      aria-live="polite"
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700"
                    >
                      {state.error}
                    </FieldDescription>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-11 w-full rounded-xl text-sm font-semibold"
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
