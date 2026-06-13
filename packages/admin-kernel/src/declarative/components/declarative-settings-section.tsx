import { FormSection, InfoCard, Input, Textarea, Card } from "@trinacria-cms/trinacria-ui";
import { useMemo } from "react";
import type { RenderableAdminSettingsSection } from "../../runtime/admin-route-runtime.js";
import type { DeclarativeField } from "../types.js";
import { useDeclarativeActionController } from "../hooks/use-declarative-action-controller.js";
import { useDeclarativeData } from "../hooks/use-declarative-data.js";
import { formatCellValue, formatEndpoint } from "../utils/formatting.js";
import { readObjectPath } from "../utils/object-path.js";
import { inferFormFields } from "../utils/schema.js";
import { DeclarativeActionsPanel } from "./declarative-actions-panel.js";
import { DeclarativeDataBinding } from "./declarative-data-binding.js";

export function DeclarativeSettingsSectionPanel({
  section
}: {
  section: RenderableAdminSettingsSection;
}) {
  const formFields = inferFormFields(section.data?.schema);
  const dataState = useDeclarativeData(section.data);
  const actionController = useDeclarativeActionController({
    onSuccess: dataState.refetch
  });
  const formValue = useMemo(
    () => readObjectPath(dataState.data, section.data?.valuePath),
    [dataState.data, section.data?.valuePath]
  );

  return (
    <div className="grid gap-4">
      <InfoCard
        eyebrow={section.pluginId}
        title={section.title}
        description={section.summary}
        className="bg-[color:var(--color-panel)]"
      />
      {section.kind === "form" || formFields.length > 0 ? (
        <FormSection
          title={section.title}
          description={section.summary ?? "Settings form generated from the plugin manifest schema."}
        >
          <div className="grid gap-4">
            {formFields.length > 0 ? (
              formFields.map((field) => (
                <DeclarativeReadonlyField
                  key={field.key}
                  field={field}
                  value={readObjectPath(formValue, field.key)}
                />
              ))
            ) : (
              <InfoCard
                title="No schema fields"
                description="Add a JSON schema with properties to let the generic settings renderer build form controls."
                className="bg-[color:var(--color-surface)]"
              />
            )}
          </div>
        </FormSection>
      ) : null}
      <Card
        eyebrow={section.kind ?? "panel"}
        title={section.data?.endpoint ? formatEndpoint(section.data.endpoint) : section.title}
      >
        <div className="grid gap-4">
          <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
            Declarative settings sections are generated from plugin metadata. A plugin can still expose a React renderer when the JSON contract is not expressive enough.
          </p>
          {section.data ? <DeclarativeDataBinding binding={section.data} dataState={dataState} /> : null}
        </div>
      </Card>
      {section.actions?.length ? (
        <DeclarativeActionsPanel
          actions={section.actions}
          onPrepare={actionController.prepareAction}
          title="Settings actions"
        />
      ) : null}
      {actionController.dialog}
    </div>
  );
}

function DeclarativeReadonlyField({ field, value }: { field: DeclarativeField; value?: unknown }) {
  const resolvedValue = value === undefined ? field.placeholder : formatCellValue(value);

  if (field.kind === "json") {
    return <Textarea label={field.label} value={resolvedValue} readOnly />;
  }

  return <Input label={field.label} value={resolvedValue} readOnly />;
}
