import { useEffect, useMemo, useState } from "react";
import { Button, Icon, Input, Select, Textarea } from "@trinacria-cms/trinacria-ui";
import { ErrorBanner, EmptyState } from "../../components/resource-feedback.js";
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
  toEditableSettingInput,
  type SettingDefinitionRecord,
  type SettingDraftValues,
  type SettingValueErrors
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
    <aside className="min-h-0 overflow-auto border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] lg:border-b-0 lg:border-r">
      <div className="px-6 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
          {t("official.route.settings.title", "Impostazioni")}
        </p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
          {sections.length} {t("settings.navigation.sections", "sezioni")}
        </p>
      </div>

      <div className="px-6 py-4">
        {sections.length === 0 ? (
          <EmptyState text={t("settings.overview.not_configured")} />
        ) : (
          <div className="grid gap-3">
            {groups.map((group) => {
              const isCollapsed = collapsedGroups[group.id] ?? false;
              const groupContentId = `settings-group-${group.id}`;
              return (
                <section key={group.id} className="grid gap-1">
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    aria-controls={groupContentId}
                    onClick={() =>
                      setCollapsedGroups((current) => ({
                        ...current,
                        [group.id]: !isCollapsed
                      }))
                    }
                    className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)] transition hover:bg-[color:var(--color-interactive-hover)] hover:text-[color:var(--color-ink-muted)]"
                  >
                    <Icon name={group.icon} className="h-4 w-4" />
                    <span className="min-w-0 flex-1 truncate">{group.label}</span>
                    <Icon
                      name={isCollapsed ? "chevron-right" : "chevron-down"}
                      className="h-3.5 w-3.5"
                    />
                  </button>
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
    <button
      type="button"
      onClick={() => onSelect(section.id)}
      title={section.title}
      aria-label={section.title}
      className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left transition ${
        isSelected
          ? "bg-[color:var(--color-interactive-selected)] text-[color:var(--color-interactive-selected-ink)]"
          : "text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-interactive-hover)] hover:text-[color:var(--color-ink)]"
      }`}
    >
      <Icon name={getSectionIcon(section.id)} className="h-4 w-4 shrink-0 opacity-75" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{label}</span>
      </span>
    </button>
  );
}

function getCompactSectionLabel(section: RenderableAdminSettingsSection, t: TranslateFn): string {
  const sectionId = section.id.toLowerCase();

  if (sectionId.includes("general")) return t("settings.navigation.general", "Generale");
  if (sectionId.includes("branding")) return t("settings.navigation.brand", "Brand");
  if (sectionId.includes("theme")) return t("settings.navigation.theme", "Tema");
  if (sectionId.includes("feature")) return t("settings.navigation.features", "Funzioni");
  if (sectionId.includes("user-flow")) return t("settings.navigation.user_access", "Utenti");
  if (sectionId.includes("authentication")) return t("settings.navigation.authentication", "Autenticazione");
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
      <div className="flex min-h-full items-center justify-center rounded-lg border border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] p-8">
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
          <div className="grid gap-1">
            <h3 className="text-xl font-semibold text-[color:var(--color-ink)]">{section.title}</h3>
            {section.summary ? (
              <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
                {section.summary}
              </p>
            ) : null}
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

      <div className="shrink-0 border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 pb-2 pt-3 sm:px-5">
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
  if (normalizedId.includes("media")) return "hard-drive";
  if (normalizedId.includes("catalog")) return "database";
  return "settings-2";
}
