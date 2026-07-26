import { Button, Card } from "@trinacria-cms/trinacria-ui";
import { useI18n } from "../lib/i18n.js";

export interface ResourcePlaceholderPageProps {
  accentLabel: string;
  summary: string;
}

/**
 * ResourcePlaceholderPage is a scaffold page used while a module exists in the
 * navigation contract but its full CRUD surface is not implemented yet.
 */
export function ResourcePlaceholderPage({ accentLabel, summary }: ResourcePlaceholderPageProps) {
  const { t } = useI18n();

  return (
    <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
      <Card eyebrow={accentLabel} title={t("placeholder.title")}>
        <p className="max-w-3xl text-sm leading-7 text-[color:var(--color-ink-muted)]">{summary}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button>{t("placeholder.actions.design_resource_table")}</Button>
          <Button variant="secondary">{t("placeholder.actions.add_filters_and_forms")}</Button>
        </div>
      </Card>
      <Card eyebrow={t("placeholder.next_step_eyebrow")} title={t("placeholder.checklist_title")}>
        <ul className="space-y-3 text-sm leading-6 text-[color:var(--color-ink-muted)]">
          <li>{t("placeholder.checklist.connect_sdk")}</li>
          <li>{t("placeholder.checklist.capability_actions")}</li>
          <li>{t("placeholder.checklist.project_widgets")}</li>
        </ul>
      </Card>
    </div>
  );
}

export function createResourcePlaceholderRender(props: ResourcePlaceholderPageProps) {
  return () => <ResourcePlaceholderPage {...props} />;
}
