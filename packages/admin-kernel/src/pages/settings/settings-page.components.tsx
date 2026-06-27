import { Badge, Button, Icon, Input, Select, Textarea } from "@trinacria-cms/trinacria-ui";
import { ErrorBanner, EmptyState } from "../../components/resource-feedback.js";
import type { TranslateFn } from "../../lib/i18n.js";
import type {
  AdminSettingsSectionRenderContext,
  RenderableAdminSettingsSection
} from "../../runtime/admin-route-runtime.js";
import {
  filterRecordsForSettingsSection,
  formatSettingFormLabel,
  getSettingEnumOptions,
  getSettingValueKind,
  groupSettingRecordsForForm,
  toEditableSettingInput,
  type SettingDefinitionRecord,
  type SettingDraftValues,
  type SettingValueErrors
} from "./settings-page.utils.js";

interface SettingsWorkspaceSidebarProps {
  records: readonly SettingDefinitionRecord[];
  sections: readonly RenderableAdminSettingsSection[];
  selectedSection: RenderableAdminSettingsSection | null;
  onSelectSection: (sectionId: string) => void;
  t: TranslateFn;
}

export function SettingsWorkspaceSidebar({
  records,
  sections,
  selectedSection,
  onSelectSection,
  t
}: SettingsWorkspaceSidebarProps) {
  return (
    <aside className="min-h-0 overflow-auto border-b border-[color:var(--color-border)] bg-white lg:border-b-0 lg:border-r">
      <div className="px-6 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
          {t("official.route.settings.title", "Impostazioni")}
        </p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
          {sections.length} {t("settings.modules.title", "Settings modules").toLowerCase()}
        </p>
      </div>

      <div className="px-6 py-4">
        {sections.length === 0 ? (
          <EmptyState text={t("settings.overview.not_configured")} />
        ) : (
          <div className="grid gap-1">
            {sections.map((section) => {
              const isSelected = section.id === selectedSection?.id;
              const sectionRecords = filterRecordsForSettingsSection(records, section);

              return (
                <button
                  key={`${section.pluginId}:${section.id}`}
                  type="button"
                  onClick={() => onSelectSection(section.id)}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
                    isSelected
                      ? "border-[color:var(--color-border-strong)] bg-white text-[color:var(--color-ink)]"
                      : "border-transparent text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-border)] hover:bg-white hover:text-[color:var(--color-ink)]"
                  }`}
                >
                  <Icon name={getSectionIcon(section.id)} className="h-4 w-4 shrink-0 opacity-75" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{section.title}</span>
                  </span>
                  <Badge>{sectionRecords.length}</Badge>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

interface SettingsSectionFormProps {
  draftValues: SettingDraftValues;
  editableRecords: readonly SettingDefinitionRecord[];
  isLoading: boolean;
  isSaving: boolean;
  onDraftValueChange: (recordKey: string, value: string) => void;
  onSave: () => void;
  saveError: string | null;
  saveMessage: string | null;
  section: RenderableAdminSettingsSection | null;
  sectionContext?: Omit<AdminSettingsSectionRenderContext, "section">;
  t: TranslateFn;
  valueErrors: SettingValueErrors;
}

export function SettingsSectionForm({
  draftValues,
  editableRecords,
  isLoading,
  isSaving,
  onDraftValueChange,
  onSave,
  saveError,
  saveMessage,
  section,
  sectionContext,
  t,
  valueErrors
}: SettingsSectionFormProps) {
  if (!section) {
    return (
      <div className="flex min-h-full items-center justify-center rounded-lg border border-dashed border-[color:var(--color-border-strong)] bg-white p-8">
        <EmptyState text={t("settings.overview.not_configured")} />
      </div>
    );
  }

  if (section.render && sectionContext) {
    return <>{section.render({ ...sectionContext, section })}</>;
  }

  const groupedRecords = groupSettingRecordsForForm(editableRecords);
  const editableRecordsCount = editableRecords.filter(
    (record) => record.mutable && record.status === "active"
  ).length;

  return (
    <form
      className="flex h-full min-h-0 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="min-h-0 flex-1 overflow-auto px-6 py-4 sm:px-8 sm:py-6">
        <div className="mx-auto grid max-w-4xl gap-6">
          <div className="border-b border-[color:var(--color-border)] pb-5">
            <h3 className="text-xl font-semibold text-[color:var(--color-ink)]">{section.title}</h3>
          </div>

          {isLoading ? <EmptyState text={t("settings.empty.loading_value")} /> : null}
          {saveError ? <ErrorBanner message={saveError} /> : null}
          {saveMessage ? (
            <p className="text-sm font-medium text-[color:var(--color-success-ink)]">
              {saveMessage}
            </p>
          ) : null}

          {!isLoading && groupedRecords.length === 0 ? (
            <EmptyState text={t("settings.module.no_settings")} />
          ) : null}

          {!isLoading
            ? groupedRecords.map((group) => (
                <section key={group.title} className="grid gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-[color:var(--color-ink)]">
                      {group.title}
                    </h4>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {group.records.map((record) => (
                      <div
                        key={record.id}
                        className={getSettingValueKind(record) === "json" ? "md:col-span-2" : ""}
                      >
                        <SettingValueField
                          draftValue={
                            draftValues[record.key] ??
                            toEditableSettingInput(record.defaultValue ?? null)
                          }
                          error={valueErrors[record.key]}
                          isSaving={isSaving}
                          onChange={(value) => onDraftValueChange(record.key, value)}
                          record={record}
                          t={t}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))
            : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-[color:var(--color-border)] bg-white px-4 pb-2 pt-3 sm:px-5">
        <div className="mx-auto flex max-w-4xl justify-end">
          <Button type="submit" disabled={isSaving || isLoading || editableRecordsCount === 0}>
            {isSaving
              ? t("common.actions.saving", "Salvataggio...")
              : t("common.actions.save", "Salva")}
          </Button>
        </div>
      </div>
    </form>
  );
}

interface SettingValueFieldProps {
  draftValue: string;
  error?: string;
  isSaving: boolean;
  onChange: (value: string) => void;
  record: SettingDefinitionRecord;
  t: TranslateFn;
}

function SettingValueField({
  draftValue,
  error,
  isSaving,
  onChange,
  record,
  t
}: SettingValueFieldProps) {
  const enumOptions = getSettingEnumOptions(record.schema);
  const valueKind = getSettingValueKind(record);
  const isDisabled = !record.mutable || isSaving;
  const label = formatSettingFormLabel(record);

  if (record.secret) {
    return (
      <Input
        label={label}
        hint={record.description}
        error={error}
        type="password"
        value={draftValue}
        placeholder={t("settings.form.secret_placeholder", "Leave empty to keep current secret")}
        autoComplete="new-password"
        readOnly={isDisabled}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    );
  }

  if (enumOptions.length > 0) {
    return (
      <Select
        label={label}
        hint={record.description}
        error={error}
        value={draftValue}
        disabled={isDisabled}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {enumOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    );
  }

  if (valueKind === "boolean") {
    return (
      <Select
        label={label}
        hint={record.description}
        error={error}
        value={draftValue === "true" ? "true" : "false"}
        disabled={isDisabled}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        <option value="true">{t("common.boolean.true", "Si")}</option>
        <option value="false">{t("common.boolean.false", "No")}</option>
      </Select>
    );
  }

  if (valueKind === "json") {
    return (
      <Textarea
        label={label}
        hint={record.description}
        error={error}
        value={draftValue}
        readOnly={isDisabled}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <Input
      label={label}
      hint={record.description}
      error={error}
      type={valueKind === "number" ? "number" : "text"}
      value={draftValue}
      readOnly={isDisabled}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}

function getSectionIcon(sectionId: string) {
  const normalizedId = sectionId.toLowerCase();
  if (normalizedId.includes("general")) return "globe";
  if (normalizedId.includes("branding")) return "sparkles";
  if (normalizedId.includes("auth")) return "lock-keyhole";
  if (normalizedId.includes("security")) return "shield-check";
  if (normalizedId.includes("cache")) return "hard-drive";
  if (normalizedId.includes("catalog")) return "database";
  return "settings-2";
}
