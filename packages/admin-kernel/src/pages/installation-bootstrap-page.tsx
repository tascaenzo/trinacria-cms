import { Button, Input, Icon } from "@trinacria-cms/admin-ui";
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
      eyebrow={t("auth.installation.eyebrow")}
      heroTitle={t("auth.installation.hero_title")}
      heroBody={t("auth.installation.hero_body")}
      formTitle={t("auth.installation.form_title")}
      formSummary={t("auth.installation.form_summary")}
      formBadgeLabel={t("auth.installation.form_badge_label")}
      formBadgeHint={t("auth.installation.form_badge_hint")}
      heroMetrics={[
        { label: t("auth.installation.mode_label"), value: t("auth.installation.mode_value") },
        { label: t("auth.installation.seed_label"), value: t("auth.installation.seed_value") },
        { label: t("auth.installation.handoff_label"), value: t("auth.installation.handoff_value") }
      ]}
      heroHighlights={[
        {
          icon: "shield",
          title: t("auth.installation.highlight.single_window.title"),
          text: t("auth.installation.highlight.single_window.text")
        },
        {
          icon: "users",
          title: t("auth.installation.highlight.seed.title"),
          text: t("auth.installation.highlight.seed.text")
        },
        {
          icon: "lock-keyhole",
          title: t("auth.installation.highlight.handoff.title"),
          text: t("auth.installation.highlight.handoff.text")
        },
        {
          icon: "layout-dashboard",
          title: t("auth.installation.highlight.kernel.title"),
          text: t("auth.installation.highlight.kernel.text")
        }
      ]}
      footer={
        <div className="flex items-center gap-2">
          <Icon name="sparkles" className="h-4 w-4 text-slate-400" />
          <span>{t("auth.installation.footer")}</span>
        </div>
      }
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
            defaultValue="Administrator"
            required
          />
          <Input
            label={t("auth.installation.password_label")}
            type="password"
            name="password"
            defaultValue="admin123"
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

        <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
          <span>{t("auth.installation.info")}</span>
          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
            {t("auth.installation.flow_label")}
            <Icon name="arrow-right" className="h-4 w-4" />
          </span>
        </div>

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
