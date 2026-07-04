import { useEffect, useMemo, useState } from "react";
import { Badge, Icon } from "@trinacria-cms/trinacria-ui";
import type { createCmsSdkClient, EmailApi, SettingsApi } from "@trinacria-cms/sdk";

type CmsClient = ReturnType<typeof createCmsSdkClient>;
type EmailProvider = "disabled" | "console" | "smtp" | "unknown";
type EmailTemplateRecord = Awaited<ReturnType<EmailApi["listEmailTemplates"]>>["data"][number];

const EMAIL_PROVIDER_SETTING_KEY = "email-pack:email:provider";

export interface EmailDeliveryWidgetContext {
  cms: CmsClient & {
    email: EmailApi;
    settings: SettingsApi;
  };
  t: (key: string, fallback?: string) => string;
  widget: {
    pluginId: string;
    title: string;
  };
}

export function EmailDeliveryWidget({ cms, t, widget }: EmailDeliveryWidgetContext) {
  const [provider, setProvider] = useState<EmailProvider>("unknown");
  const [templates, setTemplates] = useState<readonly EmailTemplateRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadEmailState() {
      try {
        setIsLoading(true);
        setError(null);
        const [providerResponse, templatesResponse] = await Promise.all([
          cms.settings.getSettingValueByKey({ path: { key: EMAIL_PROVIDER_SETTING_KEY } }),
          cms.email.listEmailTemplates()
        ]);
        if (isCancelled) return;
        setProvider(readEmailProvider(providerResponse.data?.value));
        setTemplates(templatesResponse.data);
      } catch (currentError) {
        if (isCancelled) return;
        setProvider("unknown");
        setTemplates([]);
        setError(toDisplayError(currentError));
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadEmailState();

    return () => {
      isCancelled = true;
    };
  }, [cms]);

  const activeTemplates = useMemo(
    () => templates.filter((template) => template.status === "active").length,
    [templates]
  );
  const providerTone = readProviderTone(provider);

  return (
    <article className="grid min-h-44 gap-4 rounded-lg border border-[color:var(--color-border)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
            {widget.pluginId}
          </p>
          <h3 className="mt-1 text-base font-semibold text-[color:var(--color-ink)]">
            {widget.title}
          </h3>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-surface-subtle)] text-[color:var(--color-ink-muted)]">
          <Icon name="mail" className="h-4 w-4" />
        </span>
      </div>

      {error ? (
        <p className="text-sm leading-6 text-[color:var(--color-danger-ink)]">{error}</p>
      ) : (
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-[color:var(--color-ink-muted)]">
              {t("dashboard.email.provider", "Provider")}
            </span>
            <Badge tone={providerTone}>
              {isLoading ? t("common.status.loading", "loading") : provider}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <EmailWidgetMetric
              label={t("dashboard.email.templates", "Templates")}
              value={isLoading ? "..." : String(templates.length)}
            />
            <EmailWidgetMetric
              label={t("dashboard.email.active_templates", "Active")}
              value={isLoading ? "..." : String(activeTemplates)}
            />
          </div>
        </div>
      )}
    </article>
  );
}

function EmailWidgetMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)] px-3 py-2">
      <p className="text-xs text-[color:var(--color-ink-muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[color:var(--color-ink)]">{value}</p>
    </div>
  );
}

function readEmailProvider(value: unknown): EmailProvider {
  if (value === "disabled" || value === "console" || value === "smtp") {
    return value;
  }
  return "unknown";
}

function readProviderTone(provider: EmailProvider) {
  if (provider === "smtp") return "success";
  if (provider === "console") return "warning";
  return "neutral";
}

function toDisplayError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Unexpected error";
}
