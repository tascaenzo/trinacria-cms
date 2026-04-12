import { Button, Input } from "@trinacria-cms/trinacria-ui";
import { AuthScreenLayout } from "../components/auth-screen-layout.js";
import { useI18n } from "../lib/i18n.js";

export interface InstallationBootstrapPageProps {
  isSubmitting: boolean;
  state: {
    error: string | null;
  };
  action: (formData: FormData) => void;
}

export function InstallationBootstrapPage({
  action,
  isSubmitting,
  state
}: InstallationBootstrapPageProps) {
  const { t } = useI18n();

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
      <form className="grid gap-5" action={action}>
        <div className="grid gap-4">
          <Input
            label={t("auth.installation.email_label")}
            type="email"
            name="email"
            defaultValue="admin@example.com"
            autoComplete="email"
            required
          />
          <Input
            label={t("auth.installation.display_name_label")}
            name="displayName"
            defaultValue="Admin User"
            required
          />
          <Input
            label={t("auth.installation.password_label")}
            type="password"
            name="password"
            defaultValue="admin12345!"
            autoComplete="new-password"
            required
          />
        </div>

        {state.error ? (
          <p
            role="alert"
            aria-live="polite"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {state.error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full rounded-xl text-sm font-semibold"
        >
          {isSubmitting ? t("auth.installation.submitting") : t("auth.installation.submit")}
        </Button>
      </form>
    </AuthScreenLayout>
  );
}
