import {
  Button,
  FormSection,
  Icon,
  Input,
  Select,
  SettingsSectionLayout,
  Textarea
} from "@trinacria-cms/trinacria-ui";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorBanner } from "../../components/resource-feedback.js";
import type { TranslateFn } from "../../lib/i18n.js";
import type {
  AdminSettingsSectionRenderContext,
  RenderableAdminSettingsSection
} from "../../runtime/admin-route-runtime.js";
import {
  formatSettingFormLabel,
  getSettingEnumOptions,
  getSettingValueKind,
  groupSettingRecordsForForm,
  type SettingDefinitionRecord,
  type SettingDraftValues,
  type SettingValueErrors,
  toEditableSettingInput
} from "./settings-page.utils.js";

interface SettingsWorkspaceSidebarProps {
  sections: readonly RenderableAdminSettingsSection[];
  selectedSection: RenderableAdminSettingsSection | null;
  onSelectSection: (sectionId: string) => void;
  t: TranslateFn;
}

export function SettingsWorkspaceSidebar({
  sections,
  selectedSection,
  onSelectSection,
  t
}: SettingsWorkspaceSidebarProps) {
  const groups = useMemo(() => groupSettingsSections(sections, t), [sections, t]);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const selectedGroupId = selectedSection ? getSettingsSectionGroup(selectedSection).id : null;

  useEffect(() => {
    if (!selectedGroupId) return;
    setCollapsedGroups((current) =>
      current[selectedGroupId] ? { ...current, [selectedGroupId]: false } : current
    );
  }, [selectedGroupId]);

  return (
    <aside className="min-h-0 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] lg:overflow-auto lg:border-b-0 lg:border-r">
      <div className="p-4 lg:hidden">
        <Select
          label={t("settings.navigation.section", "Sezione")}
          value={selectedSection?.id ?? ""}
          disabled={sections.length === 0}
          onChange={(event) => onSelectSection(event.currentTarget.value)}
        >
          {groups.map((group) => (
            <optgroup key={group.id} label={group.label}>
              {group.sections.map((section) => (
                <option key={`${section.pluginId}:${section.id}`} value={section.id}>
                  {getCompactSectionLabel(section, t)}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>

      <div className="hidden px-6 py-4 lg:block">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
          {t("official.route.settings.title", "Impostazioni")}
        </p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
          {sections.length} {t("settings.navigation.sections", "sezioni")}
        </p>
      </div>

      <div className="hidden px-6 py-4 lg:block">
        {sections.length === 0 ? (
          <EmptyState text={t("settings.overview.not_configured")} />
        ) : (
          <div className="grid gap-3">
            {groups.map((group) => {
              const isCollapsed = collapsedGroups[group.id] ?? false;
              const groupContentId = `settings-group-${group.id}`;
              return (
                <section key={group.id} className="grid gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    aria-expanded={!isCollapsed}
                    aria-controls={groupContentId}
                    onClick={() =>
                      setCollapsedGroups((current) => ({
                        ...current,
                        [group.id]: !isCollapsed
                      }))
                    }
                    className="min-h-10 w-full justify-start gap-2 border-transparent px-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)] shadow-none"
                  >
                    <Icon name={group.icon} className="h-4 w-4" />
                    <span className="min-w-0 flex-1 truncate">{group.label}</span>
                    <Icon
                      name={isCollapsed ? "chevron-right" : "chevron-down"}
                      className="h-3.5 w-3.5"
                    />
                  </Button>
                  <div id={groupContentId} className={isCollapsed ? "hidden" : "grid gap-1 pl-2"}>
                    {group.sections.map((section) => (
                      <SettingsSectionNavigationItem
                        key={`${section.pluginId}:${section.id}`}
                        isSelected={section.id === selectedSection?.id}
                        section={section}
                        onSelect={onSelectSection}
                        t={t}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

function SettingsSectionNavigationItem({
  isSelected,
  onSelect,
  section,
  t
}: {
  isSelected: boolean;
  onSelect: (sectionId: string) => void;
  section: RenderableAdminSettingsSection;
  t: TranslateFn;
}) {
  const label = getCompactSectionLabel(section, t);
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => onSelect(section.id)}
      title={section.title}
      aria-label={section.title}
      className={`h-10 w-full justify-start gap-3 border-transparent px-3 text-left shadow-none ${
        isSelected
          ? "bg-[color:var(--color-panel-strong)] text-[color:var(--color-ink)]"
          : "text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-interactive-hover)] hover:text-[color:var(--color-ink)]"
      }`}
    >
      <Icon name={getSectionIcon(section.id)} className="h-4 w-4 shrink-0 opacity-75" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{label}</span>
      </span>
    </Button>
  );
}

function getCompactSectionLabel(section: RenderableAdminSettingsSection, t: TranslateFn): string {
  const sectionId = section.id.toLowerCase();

  if (sectionId.includes("general")) return t("settings.navigation.general", "Generale");
  if (sectionId.includes("branding")) return t("settings.navigation.brand", "Brand");
  if (sectionId.includes("theme")) return t("settings.navigation.theme", "Tema");
  if (sectionId.includes("feature")) return t("settings.navigation.features", "Funzioni");
  if (sectionId.includes("user-flow")) return t("settings.navigation.user_access", "Utenti");
  if (sectionId.includes("authentication"))
    return t("settings.navigation.authentication", "Autenticazione");
  if (sectionId.includes("plugin-permissions")) {
    return t("settings.navigation.plugin_permissions", "Permessi");
  }
  if (sectionId.includes("plugin-management")) return t("settings.navigation.plugins", "Plugin");
  if (sectionId.includes("email-template")) return t("settings.navigation.templates", "Template");
  if (sectionId.includes("email")) return t("settings.navigation.email_delivery", "Email");
  if (sectionId.includes("media") && sectionId.includes("storage")) {
    return t("settings.navigation.media_storage", "Archiviazione");
  }
  if (sectionId.includes("media") && sectionId.includes("limit")) {
    return t("settings.navigation.media_limits", "Limiti");
  }

  return section.title;
}

interface SettingsSectionGroup {
  id: string;
  icon: "layout-dashboard" | "users" | "settings-2" | "mail" | "hard-drive";
  label: string;
  sections: readonly RenderableAdminSettingsSection[];
}

function groupSettingsSections(
  sections: readonly RenderableAdminSettingsSection[],
  t: TranslateFn
): readonly SettingsSectionGroup[] {
  const groups = new Map<string, SettingsSectionGroup>();

  for (const section of sections) {
    const group = getSettingsSectionGroup(section, t);
    const current = groups.get(group.id);
    if (current) {
      groups.set(group.id, { ...current, sections: [...current.sections, section] });
    } else {
      groups.set(group.id, { ...group, sections: [section] });
    }
  }

  const groupOrder = ["workspace", "access", "communication", "media", "system"];
  return [...groups.values()].sort(
    (left, right) => groupOrder.indexOf(left.id) - groupOrder.indexOf(right.id)
  );
}

function getSettingsSectionGroup(
  section: RenderableAdminSettingsSection,
  t?: TranslateFn
): Omit<SettingsSectionGroup, "sections"> {
  const label = (key: string, fallback: string) => t?.(key, fallback) ?? fallback;
  const sectionId = section.id.toLowerCase();
  const category = section.category?.toLowerCase();

  if (
    category === "site" ||
    category === "internationalization" ||
    category === "branding" ||
    sectionId.includes("general") ||
    sectionId.includes("branding") ||
    sectionId.includes("theme")
  ) {
    return {
      id: "workspace",
      label: label("settings.navigation.group.workspace", "Aspetto"),
      icon: "layout-dashboard"
    };
  }

  if (
    category === "user_flows" ||
    category === "auth" ||
    sectionId.includes("user-flow") ||
    sectionId.includes("authentication") ||
    sectionId.includes("plugin-permissions")
  ) {
    return {
      id: "access",
      label: label("settings.navigation.group.access", "Accesso"),
      icon: "users"
    };
  }

  if (category === "email" || section.pluginId === "email-pack" || sectionId.includes("email")) {
    return {
      id: "communication",
      label: label("settings.navigation.group.communication", "Email"),
      icon: "mail"
    };
  }

  if (sectionId.includes("media") || category === "storage" || category === "limits") {
    return {
      id: "media",
      label: label("settings.navigation.group.media", "Media"),
      icon: "hard-drive"
    };
  }

  if (category === "features" || sectionId.includes("plugin-management")) {
    return {
      id: "system",
      label: label("settings.navigation.group.system", "Sistema"),
      icon: "settings-2"
    };
  }

  return {
    id: "system",
    label: label("settings.navigation.group.system", "Sistema"),
    icon: "settings-2"
  };
}

interface SettingsSectionFormProps {
  draftValues: SettingDraftValues;
  editableRecords: readonly SettingDefinitionRecord[];
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  onDraftValueChange: (recordKey: string, value: string) => void;
  onCustomDirtyChange: (isDirty: boolean) => void;
  onReset: () => void;
  onSave: () => void;
  saveError: string | null;
  section: RenderableAdminSettingsSection | null;
  sectionContext?: Omit<AdminSettingsSectionRenderContext, "section">;
  t: TranslateFn;
  valueErrors: SettingValueErrors;
}

export function SettingsSectionForm({
  draftValues,
  editableRecords,
  isDirty,
  isLoading,
  isSaving,
  onDraftValueChange,
  onCustomDirtyChange,
  onReset,
  onSave,
  saveError,
  section,
  sectionContext,
  t,
  valueErrors
}: SettingsSectionFormProps) {
  if (!section) {
    return (
      <EmptyState
        className="min-h-full place-items-center p-8 text-center"
        text={t("settings.overview.not_configured")}
      />
    );
  }

  if (section.render && sectionContext) {
    return (
      <>{section.render({ ...sectionContext, section, onDirtyChange: onCustomDirtyChange })}</>
    );
  }

  const groupedRecords = groupSettingRecordsForForm(editableRecords, t);
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
      <SettingsSectionLayout
        title={section.title}
        description={section.summary}
        feedback={saveError ? <ErrorBanner message={saveError} /> : undefined}
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={isSaving || isLoading || !isDirty}
              onClick={onReset}
            >
              {t("common.actions.reset", "Ripristina")}
            </Button>
            <Button
              type="submit"
              disabled={isSaving || isLoading || !isDirty || editableRecordsCount === 0}
            >
              {isSaving
                ? t("common.actions.saving", "Salvataggio...")
                : t("common.actions.save", "Salva")}
            </Button>
          </>
        }
      >
        {isLoading ? <EmptyState text={t("settings.empty.loading_value")} /> : null}

        {!isLoading && groupedRecords.length === 0 ? (
          <EmptyState text={t("settings.module.no_settings")} />
        ) : null}

        {!isLoading
          ? groupedRecords.map((group) => (
              <FormSection key={group.title} headingLevel={3} variant="plain" title={group.title}>
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
              </FormSection>
            ))
          : null}
      </SettingsSectionLayout>
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
  const isReadOnly = !record.mutable;
  const label = formatSettingFormLabel(record);

  if (record.secret) {
    return (
      <Input
        label={label}
        hint={record.description}
        error={error}
        type="password"
        value={draftValue}
        placeholder={t(
          "settings.form.secret_placeholder",
          "Lascia vuoto per mantenere il valore attuale"
        )}
        autoComplete="new-password"
        disabled={isSaving}
        readOnly={isReadOnly}
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
        disabled={isReadOnly || isSaving}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {enumOptions.map((option) => (
          <option key={option} value={option}>
            {formatSettingOptionLabel(option, t)}
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
        disabled={isReadOnly || isSaving}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        <option value="true">{t("common.boolean.true", "Sì")}</option>
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
        disabled={isSaving}
        readOnly={isReadOnly}
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
      disabled={isSaving}
      readOnly={isReadOnly}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}

function formatSettingOptionLabel(option: string, t: TranslateFn) {
  const fallbacks: Record<string, string> = {
    active: "Attivo",
    disabled: "Disabilitato",
    enabled: "Abilitato",
    invite_only: "Solo su invito",
    optional: "Facoltativo",
    private: "Privato",
    public: "Pubblico",
    required: "Obbligatorio"
  };
  const fallback =
    fallbacks[option] ??
    option.replace(/[-_]/g, " ").replace(/^./, (character) => character.toUpperCase());
  return t(`settings.option.${option}`, fallback);
}

function getSectionIcon(sectionId: string) {
  const normalizedId = sectionId.toLowerCase();
  if (normalizedId.includes("general")) return "globe";
  if (normalizedId.includes("branding")) return "sparkles";
  if (normalizedId.includes("auth")) return "lock-keyhole";
  if (normalizedId.includes("security")) return "shield-check";
  if (normalizedId.includes("cache")) return "hard-drive";
  if (normalizedId.includes("media")) return "hard-drive";
  if (normalizedId.includes("catalog")) return "database";
  return "settings-2";
}
