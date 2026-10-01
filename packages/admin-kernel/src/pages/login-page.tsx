import {
  Button,
  CenteredPanel,
  ErrorBanner,
  FieldDescription,
  FieldGroup,
  Input
} from "@trinacria-cms/trinacria-ui";
import { useEffect, useState } from "react";
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
    <CenteredPanel title={t("auth.login.title")} description={t("auth.login.summary")}>
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

          {hasError ? <ErrorBanner id="login-form-error" message={state.error} /> : null}

          <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
            {isSubmitting ? t("auth.login.submitting") : t("auth.login.submit")}
          </Button>

          <FieldDescription className="text-center text-sm">
            {t("auth.login.helper")}
          </FieldDescription>
        </FieldGroup>
      </form>
    </CenteredPanel>
  );
}
