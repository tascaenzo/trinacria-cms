import { Card } from "@trinacria-cms/trinacria-ui";
import type { TranslateFn } from "../lib/i18n.js";

interface BackofficeShellStatusProps {
  error: string | null;
  isLoading: boolean;
  t: TranslateFn;
}

export function BackofficeShellStatus({ error, isLoading, t }: BackofficeShellStatusProps) {
  if (error) {
    return (
      <Card
        eyebrow={t("auth.installation.eyebrow")}
        title={t("backoffice.shell.discovery_error_title")}
      >
        <p className="text-sm leading-7 text-[color:var(--color-ink-muted)]">{error}</p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card
        eyebrow={t("auth.installation.eyebrow")}
        title={t("backoffice.shell.loading_discovery_title")}
      >
        <p className="text-sm leading-7 text-[color:var(--color-ink-muted)]">
          {t("backoffice.shell.loading_discovery_body")}
        </p>
      </Card>
    );
  }

  return null;
}
