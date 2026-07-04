import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeadCell,
  DataTableHeaderRow,
  DataTablePrimaryCell,
  DataTableRow,
  DataTableTable,
  Dialog,
  InfoCard,
  PropertyItem,
  PropertyList
} from "@trinacria-cms/trinacria-ui";
import type {
  AdminSettingsSectionRenderContext,
  RenderableAdminSettingsSection
} from "../../runtime/admin-route-runtime.js";
import {
  MobileRecordCard,
  MobileRecordField,
  MobileRecordList
} from "../../components/mobile-records.js";
import { ErrorBanner, EmptyState } from "../../components/resource-feedback.js";
import {
  writeBackofficeNavigationState,
  getBackofficeRouteStateParam,
  getBackofficeNavigationEventName
} from "../../runtime/backoffice-navigation-state.js";
import { cms } from "../../runtime/cms-sdk.js";
import { toDisplayError } from "../../lib/sdk-errors.js";
import { useI18n } from "../../lib/i18n.js";
import { translateStatusLabel } from "../../lib/ui-translations.js";
import {
  filterRecordsForSettingsSection,
  formatSettingFormLabel,
  isVisibleSettingDefinition,
  isVisibleSettingsSection,
  parseSettingFormValue,
  type SettingDefinitionRecord
} from "./settings-page.utils.js";
import { SettingsSectionForm, SettingsWorkspaceSidebar } from "./settings-page.components.js";
import {
  useSettingsDefinitions,
  useSettingsOverview,
  useSettingsSectionDrafts,
  type CmsOverviewItem
} from "./settings-page.hooks.js";

export interface SettingsPageProps {
  sectionContext?: Omit<AdminSettingsSectionRenderContext, "section">;
  settings?: readonly RenderableAdminSettingsSection[];
}

export function SettingsPage({ sectionContext, settings = [] }: SettingsPageProps = {}) {
  const { t } = useI18n();
  const [isInspectOpen] = useState(true);

  const [activeSectionId, setActiveSectionId] = useState<string | null>(() => {
    return getBackofficeRouteStateParam("section") ?? settings[0]?.id ?? null;
  });

  const {
    error,
    isLoading,
    records,
    refresh
  } = useSettingsDefinitions();
  const visibleRecords = useMemo(() => records.filter(isVisibleSettingDefinition), [records]);
  const { isOverviewLoading, overviewItems } = useSettingsOverview(visibleRecords);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    function handleNavigationChange() {
      const section = getBackofficeRouteStateParam("section");
      if (section) {
        setActiveSectionId(section);
      }
    }

    const navigationEventName = getBackofficeNavigationEventName();
    window.addEventListener(navigationEventName, handleNavigationChange);
    window.addEventListener("popstate", handleNavigationChange);
    return () => {
      window.removeEventListener(navigationEventName, handleNavigationChange);
      window.removeEventListener("popstate", handleNavigationChange);
    };
  }, []);

  const handleSelectSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setSaveError(null);
    setSaveMessage(null);
    const params = new URLSearchParams();
    params.set("section", sectionId);
    writeBackofficeNavigationState("settings", params);
  };

  async function saveSettingsSection() {
    const editableRecords = selectedSectionRecords.filter(
      (record) => record.mutable && record.status === "active"
    );
    if (editableRecords.length === 0) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const updates = editableRecords.map((record) => {
        if (record.secret) {
          return {
            record,
            value: sectionDraftValues[record.key] ?? ""
          };
        }

        try {
          return {
            record,
            value: parseSettingFormValue(record, sectionDraftValues[record.key] ?? "")
          };
        } catch (currentError) {
          const detail =
            currentError instanceof Error
              ? currentError.message
              : t("settings.form.invalid_value", "Valore non valido.");
          throw new Error(`${formatSettingFormLabel(record)}: ${detail}`, { cause: currentError });
        }
      });

      await Promise.all(
        updates.map(({ record, value }) => {
          if (record.secret) {
            const plaintext = String(value).trim();
            if (!plaintext) {
              return Promise.resolve();
            }
            return cms.settings.upsertSettingSecret({
              path: { key: record.key },
              body: {
                plaintext,
                updatedBy: "backoffice"
              }
            });
          }

          return cms.settings.upsertSettingValue({
            path: { key: record.key },
            body: {
              value,
              updatedBy: "backoffice"
            }
          });
        })
      );

      setSaveMessage(t("settings.form.saved", "Impostazioni salvate."));
      void refresh();
    } catch (currentError) {
      setSaveError(toDisplayError(currentError));
    } finally {
      setIsSaving(false);
    }
  }

  function closeSettingsWorkspace() {
    writeBackofficeNavigationState("dashboard");
  }

  const activeDefinitionsCount = visibleRecords.filter(
    (record) => record.status === "active"
  ).length;
  const ownerPluginsCount = new Set(visibleRecords.map((record) => record.ownerPluginId)).size;

  const operationalSettings = useMemo(
    () =>
      settings.filter(
        (section) => !section.id.endsWith("settings-catalog") && isVisibleSettingsSection(section)
      ),
    [settings]
  );

  const selectedSection = useMemo(() => {
    const sectionId = activeSectionId ?? operationalSettings[0]?.id ?? null;
    return (
      operationalSettings.find((section) => section.id === sectionId) ??
      operationalSettings[0] ??
      null
    );
  }, [activeSectionId, operationalSettings]);

  const selectedSectionRecords = useMemo(
    () => (selectedSection ? filterRecordsForSettingsSection(visibleRecords, selectedSection) : []),
    [selectedSection, visibleRecords]
  );
  const { isSectionValuesLoading, sectionDraftValues, sectionValueErrors, setSectionDraftValues } =
    useSettingsSectionDrafts(selectedSectionRecords, t);

  function openRecordSection(record: SettingDefinitionRecord) {
    const recordSection = operationalSettings.find((section) =>
      filterRecordsForSettingsSection(visibleRecords, section).some(
        (entry) => entry.id === record.id
      )
    );
    if (recordSection) {
      handleSelectSection(recordSection.id);
    }
  }

  function handleSectionDraftValueChange(recordKey: string, value: string) {
    setSectionDraftValues((current) => ({ ...current, [recordKey]: value }));
    setSaveError(null);
    setSaveMessage(null);
  }

  function renderOverviewValue(item: CmsOverviewItem): string {
    if (item.status === "resolved" && item.value) return item.value;
    if (item.status === "error") return t("settings.overview.unavailable");
    return t("settings.overview.not_configured");
  }

  function renderOverviewLabel(field: CmsOverviewItem["field"]): string {
    switch (field) {
      case "siteName":
        return t("settings.overview.site_name");
      case "siteUrl":
        return t("settings.overview.site_url");
      case "locale":
        return t("settings.overview.locale");
      case "timezone":
        return t("settings.overview.timezone");
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
      <Card eyebrow={t("settings.eyebrow")} title={t("settings.title")}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-[color:var(--color-border)] pb-4">
          <p className="max-w-2xl text-sm leading-6 text-[color:var(--color-ink-muted)]">
            {t("settings.summary")}
          </p>
          <Button type="button" variant="secondary" onClick={() => void refresh()}>
            {t("common.actions.refresh")}
          </Button>
        </div>
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <EmptyState text={t("settings.empty.loading_definitions")} /> : null}
        {!isLoading ? (
          <>
            <MobileRecordList>
              {visibleRecords.map((record) => (
                <MobileRecordCard
                  key={record.id}
                  title={record.key}
                  subtitle={record.category ?? t("settings.uncategorized")}
                  badges={
                    <Badge tone={record.status === "active" ? "success" : "warning"}>
                      {translateStatusLabel(record.status, t)}
                    </Badge>
                  }
                  actions={
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => openRecordSection(record)}
                    >
                      {t("common.actions.open", "Apri")}
                    </Button>
                  }
                >
                  <MobileRecordField label={t("common.table.owner")} value={record.ownerPluginId} />
                </MobileRecordCard>
              ))}
            </MobileRecordList>

            <DataTable>
              <DataTableTable>
                <DataTableHead>
                  <DataTableHeaderRow>
                    <DataTableHeadCell>{t("common.table.key")}</DataTableHeadCell>
                    <DataTableHeadCell>{t("common.table.owner")}</DataTableHeadCell>
                    <DataTableHeadCell>{t("common.table.status")}</DataTableHeadCell>
                    <DataTableHeadCell>{t("common.table.action")}</DataTableHeadCell>
                  </DataTableHeaderRow>
                </DataTableHead>
                <DataTableBody>
                  {visibleRecords.map((record) => (
                    <DataTableRow key={record.id}>
                      <DataTablePrimaryCell meta={record.category ?? t("settings.uncategorized")}>
                        {record.key}
                      </DataTablePrimaryCell>
                      <DataTableCell className="text-[color:var(--color-ink-muted)]">
                        {record.ownerPluginId}
                      </DataTableCell>
                      <DataTableCell>
                        <Badge tone={record.status === "active" ? "success" : "warning"}>
                          {translateStatusLabel(record.status, t)}
                        </Badge>
                      </DataTableCell>
                      <DataTableCell>
                        <Button variant="secondary" onClick={() => openRecordSection(record)}>
                          {t("common.actions.open", "Apri")}
                        </Button>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTableTable>
            </DataTable>
          </>
        ) : null}
      </Card>

      <div className="grid gap-4">
        <Card eyebrow={t("settings.overview.eyebrow")} title={t("settings.overview.title")}>
          <div className="grid gap-4">
            <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
              {t("settings.overview.summary")}
            </p>
            {isOverviewLoading ? <EmptyState text={t("settings.overview.loading")} /> : null}
            {!isOverviewLoading ? (
              <PropertyList columns={2}>
                {overviewItems.map((item) => (
                  <PropertyItem
                    key={item.field}
                    label={renderOverviewLabel(item.field)}
                    value={renderOverviewValue(item)}
                    hint={
                      item.key
                        ? `${t("settings.overview.detected_key")} ${item.key}`
                        : t("settings.overview.not_configured_hint")
                    }
                  />
                ))}
                <PropertyItem
                  label={t("settings.overview.active_definitions")}
                  value={activeDefinitionsCount}
                  hint={t("settings.overview.active_definitions_hint")}
                />
                <PropertyItem
                  label={t("settings.overview.owner_plugins")}
                  value={ownerPluginsCount}
                  hint={t("settings.overview.owner_plugins_hint")}
                />
              </PropertyList>
            ) : null}
          </div>
        </Card>

        <Card eyebrow={t("settings.policy.eyebrow")} title={t("settings.policy.title")}>
          <div className="grid gap-4">
            <InfoCard
              title={t("settings.policy.ownership.title")}
              description={t("settings.policy.ownership.body")}
            />
            <InfoCard
              title={t("settings.policy.json_first.title")}
              description={t("settings.policy.json_first.body")}
            />
          </div>
        </Card>
      </div>

      <Dialog
        open={isInspectOpen}
        title={t("official.route.settings.title", "Impostazioni")}
        description={selectedSection?.summary ?? selectedSection?.title}
        closeLabel={t("common.actions.close")}
        closeShortcutLabel="Esc"
        closeVariant="icon"
        onClose={closeSettingsWorkspace}
        width="fullscreen"
      >
        {isLoading ? <EmptyState text={t("settings.empty.loading_definitions")} /> : null}
        {!isLoading ? (
          <div className="grid h-full min-h-0 bg-white lg:grid-cols-[360px_minmax(0,1fr)]">
            <SettingsWorkspaceSidebar
              onSelectSection={handleSelectSection}
              records={visibleRecords}
              sections={operationalSettings}
              selectedSection={selectedSection}
              t={t}
            />

            <section className="min-h-0 bg-white">
              <SettingsSectionForm
                draftValues={sectionDraftValues}
                editableRecords={selectedSectionRecords}
                isLoading={isSectionValuesLoading}
                isSaving={isSaving}
                onDraftValueChange={handleSectionDraftValueChange}
                onSave={() => void saveSettingsSection()}
                saveError={saveError}
                saveMessage={saveMessage}
                section={selectedSection}
                sectionContext={sectionContext}
                t={t}
                valueErrors={sectionValueErrors}
              />
            </section>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
