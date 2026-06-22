import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
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
  FilterBar,
  Icon,
  InfoCard,
  Input,
  PropertyItem,
  PropertyList,
  Select,
  Textarea
} from "@trinacria-cms/trinacria-ui";
import type {
  GetSettingValueByKeyResponse,
  ListSettingDefinitionsResponse
} from "@trinacria-cms/sdk";
import type {
  AdminSettingsSectionRenderContext,
  RenderableAdminSettingsSection
} from "../runtime/admin-route-runtime.js";
import {
  MobileRecordCard,
  MobileRecordField,
  MobileRecordList
} from "../components/mobile-records.js";
import { ErrorBanner, EmptyState } from "../components/resource-feedback.js";
import { formatDateTime } from "../lib/formatting.js";
import {
  type AsyncActionState,
  createIdleAsyncActionState,
  readOptionalString
} from "../runtime/action-state.js";
import {
  writeBackofficeNavigationState,
  getBackofficeRouteStateParam,
  getBackofficeNavigationEventName
} from "../runtime/backoffice-navigation-state.js";
import { cms } from "../runtime/cms-sdk.js";
import { getSdkErrorDetails, toDisplayError } from "../lib/sdk-errors.js";
import { useI18n } from "../lib/i18n.js";
import { translateStatusLabel } from "../lib/ui-translations.js";

type SettingDefinitionRecord = ListSettingDefinitionsResponse["data"][number];
type SettingValueRecord = GetSettingValueByKeyResponse["data"] | null;
type SettingJsonValue = string | number | boolean | null | unknown[] | { [key: string]: unknown };
type CmsOverviewField = "siteName" | "siteUrl" | "locale" | "timezone";
type CmsOverviewItem = {
  field: CmsOverviewField;
  key: string | null;
  value: string | null;
  status: "resolved" | "missing" | "error";
};
export interface SettingsPageProps {
  sectionContext?: Omit<AdminSettingsSectionRenderContext, "section">;
  settings?: readonly RenderableAdminSettingsSection[];
}

const CMS_OVERVIEW_CANDIDATES: Record<
  CmsOverviewField,
  {
    exact: readonly string[];
    match: (normalizedKey: string) => boolean;
  }
> = {
  siteName: {
    exact: [
      "core-pack:site:name",
      "core-pack:site.name",
      "core-pack:site_name",
      "core-pack:cms.site_name",
      "core-pack:cms.site.title",
      "cms:site.name",
      "cms:site_name",
      "cms:site.title"
    ],
    match: (key) => key.includes("site") && (key.includes("name") || key.includes("title"))
  },
  siteUrl: {
    exact: [
      "core-pack:site:url",
      "core-pack:site.url",
      "core-pack:site_url",
      "core-pack:cms.site_url",
      "core-pack:cms.public_url",
      "cms:site.url",
      "cms:site_url",
      "cms:public_url"
    ],
    match: (key) =>
      (key.includes("site") || key.includes("public") || key.includes("base")) &&
      (key.includes("url") || key.includes("origin"))
  },
  locale: {
    exact: [
      "core-pack:cms:locale",
      "core-pack:locale",
      "core-pack:cms.locale",
      "core-pack:i18n.locale",
      "cms:locale",
      "site:locale"
    ],
    match: (key) => key.includes("locale") || key.includes("language")
  },
  timezone: {
    exact: [
      "core-pack:cms:timezone",
      "core-pack:timezone",
      "core-pack:cms.timezone",
      "cms:timezone",
      "site:timezone"
    ],
    match: (key) => key.includes("timezone") || key.includes("time_zone")
  }
};

function findOverviewSettingKey(
  records: readonly SettingDefinitionRecord[],
  field: CmsOverviewField
): string | null {
  const definition = CMS_OVERVIEW_CANDIDATES[field];
  const exactMatch = records.find((record) =>
    definition.exact.includes(record.key.trim().toLowerCase())
  );
  if (exactMatch) return exactMatch.key;

  const heuristicMatch = records.find((record) =>
    definition.match(record.key.trim().toLowerCase())
  );
  return heuristicMatch?.key ?? null;
}

function stringifySettingValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((entry) => stringifySettingValue(entry)).join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return "";
}

function toEditableSettingInput(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value ?? null, null, 2);
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

export function SettingsPage({ sectionContext, settings = [] }: SettingsPageProps = {}) {
  const { t } = useI18n();
  const [records, setRecords] = useState<readonly SettingDefinitionRecord[]>([]);
  const [ownerPluginId, setOwnerPluginId] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<SettingDefinitionRecord | null>(null);
  const [valueRecord, setValueRecord] = useState<SettingValueRecord>(null);
  const [error, setError] = useState<string | null>(null);
  const [valueError, setValueError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValueLoading, setIsValueLoading] = useState(false);
  const [isInspectOpen] = useState(true);

  const [activeSectionId, setActiveSectionId] = useState<string | null>(() => {
    return getBackofficeRouteStateParam("section") ?? settings[0]?.id ?? null;
  });

  const [overviewItems, setOverviewItems] = useState<readonly CmsOverviewItem[]>([]);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);
  const [draftValueJson, setDraftValueJson] = useState("null");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async (nextOwnerPluginId = "") => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await cms.settings.listSettingDefinitions({
        query: {
          ownerPluginId: nextOwnerPluginId || undefined,
          limit: 100,
          offset: 0
        }
      });
      setOwnerPluginId(nextOwnerPluginId);
      setRecords(response.data);
    } catch (currentError) {
      setError(toDisplayError(currentError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh("");
  }, [refresh]);

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
    const section = settings.find((entry) => entry.id === sectionId);
    const firstRecord = section ? filterRecordsForSettingsSection(records, section)[0] : undefined;
    if (firstRecord) {
      void inspectRecord(firstRecord);
    } else {
      setSelectedRecord(null);
    }
    const params = new URLSearchParams();
    params.set("section", sectionId);
    writeBackofficeNavigationState("settings", params);
  };

  useEffect(() => {
    let isCancelled = false;

    async function loadOverview() {
      setIsOverviewLoading(true);
      const fields: readonly CmsOverviewField[] = ["siteName", "siteUrl", "locale", "timezone"];
      const nextItems = await Promise.all(
        fields.map(async (field) => {
          const key = findOverviewSettingKey(records, field);
          if (!key) {
            return { field, key: null, value: null, status: "missing" } satisfies CmsOverviewItem;
          }

          try {
            const response = await cms.settings.getSettingValueByKey({ path: { key } });
            const value = stringifySettingValue(response.data?.value);
            if (!value) {
              return { field, key, value: null, status: "missing" } satisfies CmsOverviewItem;
            }

            return { field, key, value, status: "resolved" } satisfies CmsOverviewItem;
          } catch {
            return { field, key, value: null, status: "error" } satisfies CmsOverviewItem;
          }
        })
      );

      if (isCancelled) return;
      setOverviewItems(nextItems);
      setIsOverviewLoading(false);
    }

    void loadOverview();

    return () => {
      isCancelled = true;
    };
  }, [records]);

  const [filterState, submitFilter, isFilterPending] = useActionState(
    async (_previousState: AsyncActionState<string>, formData: FormData) => {
      const nextOwnerPluginId = readOptionalString(formData, "ownerPluginId") ?? "";
      try {
        const response = await cms.settings.listSettingDefinitions({
          query: {
            ownerPluginId: nextOwnerPluginId || undefined,
            limit: 100,
            offset: 0
          }
        });
        setOwnerPluginId(nextOwnerPluginId);
        setRecords(response.data);
        setError(null);
        return { ok: true, error: null, data: nextOwnerPluginId };
      } catch (currentError) {
        return {
          ok: false,
          error: toDisplayError(currentError),
          data: null
        };
      }
    },
    createIdleAsyncActionState<string>()
  );

  async function inspectRecord(record: SettingDefinitionRecord) {
    const recordSection = settings.find((section) =>
      filterRecordsForSettingsSection(records, section).some((entry) => entry.id === record.id)
    );
    if (recordSection) {
      setActiveSectionId(recordSection.id);
    }

    setSelectedRecord(record);
    setIsValueLoading(true);
    setValueError(null);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const response = await cms.settings.getSettingValueByKey({ path: { key: record.key } });
      setValueRecord(response.data);
      setValueError(null);
    } catch (currentError) {
      const details = getSdkErrorDetails(currentError);
      if (details.status === 404) {
        setValueRecord(null);
        setValueError(null);
      } else {
        setValueRecord(null);
        setValueError(details.message ?? t("settings.inspect.value_unavailable"));
      }
    } finally {
      setIsValueLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedRecord) return;

    const baseValue =
      valueRecord?.value ?? selectedRecord.defaultValue ?? selectedRecord.schema ?? null;
    setDraftValueJson(toEditableSettingInput(baseValue));
    setSaveError(null);
    setSaveMessage(null);
  }, [selectedRecord, valueRecord]);

  async function saveSettingValue() {
    if (!selectedRecord) return;
    if (selectedRecord.secret || !selectedRecord.mutable) return;

    try {
      const parsed = parseSettingFormValue(selectedRecord, draftValueJson);
      setIsSaving(true);
      setSaveError(null);
      setSaveMessage(null);
      await cms.settings.upsertSettingValue({
        path: { key: selectedRecord.key },
        body: {
          value: parsed,
          updatedBy: "backoffice"
        }
      });
      setSaveMessage(t("settings.form.saved", "Impostazione salvata."));
      await inspectRecord(selectedRecord);
      void refresh(ownerPluginId);
    } catch (currentError) {
      setSaveError(toDisplayError(currentError));
    } finally {
      setIsSaving(false);
    }
  }

  function closeSettingsWorkspace() {
    setSelectedRecord(null);
    writeBackofficeNavigationState("dashboard");
  }

  const activeDefinitionsCount = records.filter((record) => record.status === "active").length;
  const ownerPluginsCount = new Set(records.map((record) => record.ownerPluginId)).size;

  const selectedSection = useMemo(() => {
    const sectionId = activeSectionId ?? settings[0]?.id ?? null;
    return settings.find((section) => section.id === sectionId) ?? null;
  }, [activeSectionId, settings]);

  const selectedSectionRecords = useMemo(
    () => (selectedSection ? filterRecordsForSettingsSection(records, selectedSection) : []),
    [records, selectedSection]
  );

  useEffect(() => {
    if (selectedRecord || selectedSectionRecords.length === 0) {
      return;
    }

    void inspectRecord(selectedSectionRecords[0]);
  }, [selectedRecord, selectedSectionRecords]);

  function renderOverviewValue(item: CmsOverviewItem): string {
    if (item.status === "resolved" && item.value) return item.value;
    if (item.status === "error") return t("settings.overview.unavailable");
    return t("settings.overview.not_configured");
  }

  function renderOverviewLabel(field: CmsOverviewField): string {
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

  function renderSettingsNavigation() {
    if (settings.length === 0) {
      return <EmptyState text={t("settings.overview.not_configured")} />;
    }

    return (
      <div className="grid gap-1">
        {settings.map((section) => {
          const isSelected = section.id === selectedSection?.id;
          const sectionRecords = filterRecordsForSettingsSection(records, section);
          const iconName = getSectionIcon(section.id);

          return (
            <div key={`${section.pluginId}:${section.id}`} className="grid gap-1">
              <button
                type="button"
                onClick={() => handleSelectSection(section.id)}
                className={`flex h-11 w-full items-center gap-3 rounded-lg border px-3 text-left transition ${
                  isSelected
                    ? "border-[color:var(--color-border-strong)] bg-white text-[color:var(--color-ink)]"
                    : "border-transparent text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-border)] hover:bg-white hover:text-[color:var(--color-ink)]"
                }`}
              >
                <Icon name={iconName} className="h-4 w-4 shrink-0 opacity-75" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {section.title}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge>{sectionRecords.length}</Badge>
                  <Icon
                    name={isSelected ? "chevron-down" : "chevron-right"}
                    className="h-4 w-4 opacity-70"
                  />
                </span>
              </button>

              {isSelected ? (
                <div className="ml-7 grid gap-1 border-l border-[color:var(--color-border)] pl-3">
                  {sectionRecords.length > 0 ? (
                    sectionRecords.map((record) => {
                      const isRecordSelected = record.id === selectedRecord?.id;

                      return (
                        <button
                          key={record.id}
                          type="button"
                          onClick={() => void inspectRecord(record)}
                          className={`flex h-9 items-center gap-2 rounded-md border px-3 text-left text-xs transition ${
                            isRecordSelected
                              ? "border-[color:var(--color-border-strong)] bg-white text-[color:var(--color-ink)]"
                              : "border-transparent text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-border)] hover:bg-white hover:text-[color:var(--color-ink)]"
                          }`}
                        >
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {formatSettingNavLabel(record)}
                          </span>
                          <span className="shrink-0 rounded-full border border-[color:var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] opacity-75">
                            {translateStatusLabel(record.status, t)}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-md border border-dashed border-[color:var(--color-border)] px-3 py-2 text-xs text-[color:var(--color-ink-muted)]">
                      {t("settings.module.no_settings")}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  function renderSettingValueField(record: SettingDefinitionRecord) {
    const enumOptions = getSettingEnumOptions(record.schema);
    const valueKind = getSettingValueKind(record);
    const isDisabled = record.secret || !record.mutable || isSaving;
    const label = formatSettingFormLabel(record);

    if (record.secret) {
      return (
        <Input
          label={label}
          value={t("settings.form.secret_placeholder", "Valore secret protetto")}
          readOnly
          disabled
        />
      );
    }

    if (enumOptions.length > 0) {
      return (
        <Select
          label={label}
          value={draftValueJson}
          disabled={isDisabled}
          onChange={(event) => {
            setDraftValueJson(event.currentTarget.value);
            setSaveError(null);
            setSaveMessage(null);
          }}
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
          value={draftValueJson === "true" ? "true" : "false"}
          disabled={isDisabled}
          onChange={(event) => {
            setDraftValueJson(event.currentTarget.value);
            setSaveError(null);
            setSaveMessage(null);
          }}
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
          value={draftValueJson}
          readOnly={isDisabled}
          onChange={(event) => {
            setDraftValueJson(event.target.value);
            setSaveError(null);
            setSaveMessage(null);
          }}
        />
      );
    }

    return (
      <Input
        label={label}
        type={valueKind === "number" ? "number" : "text"}
        value={draftValueJson}
        readOnly={isDisabled}
        onChange={(event) => {
          setDraftValueJson(event.currentTarget.value);
          setSaveError(null);
          setSaveMessage(null);
        }}
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
      <Card eyebrow={t("settings.eyebrow")} title={t("settings.title")}>
        <div className="mb-5 border-b border-[color:var(--color-border)] pb-4">
          <FilterBar
            key={ownerPluginId}
            action={submitFilter}
            summary={t("settings.summary")}
            actions={
              <>
                <div className="self-end">
                  <Button type="submit" variant="secondary" disabled={isFilterPending}>
                    {t("common.actions.apply_filter")}
                  </Button>
                </div>
                <div className="self-end">
                  <Button type="button" onClick={() => void refresh()}>
                    {t("common.actions.refresh")}
                  </Button>
                </div>
              </>
            }
          >
            <Input
              label={t("settings.filter.owner_plugin")}
              name="ownerPluginId"
              defaultValue={ownerPluginId}
              hint={t("settings.filter.owner_plugin_hint")}
            />
          </FilterBar>
          {filterState.error ? <ErrorBanner message={filterState.error} /> : null}
        </div>
        {error ? <ErrorBanner message={error} /> : null}
        {isLoading ? <EmptyState text={t("settings.empty.loading_definitions")} /> : null}
        {!isLoading ? (
          <>
            <MobileRecordList>
              {records.map((record) => (
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
                      onClick={() => inspectRecord(record)}
                    >
                      {t("common.actions.inspect_json")}
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
                  {records.map((record) => (
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
                        <Button variant="secondary" onClick={() => inspectRecord(record)}>
                          {t("common.actions.inspect_json")}
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
        description={selectedRecord?.key ?? selectedSection?.title}
        closeLabel={t("common.actions.close")}
        closeShortcutLabel="Esc"
        closeVariant="icon"
        onClose={closeSettingsWorkspace}
        width="fullscreen"
      >
        {isLoading ? <EmptyState text={t("settings.empty.loading_definitions")} /> : null}
        {!isLoading && !selectedRecord ? (
          <div className="grid h-full min-h-0 bg-white lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="min-h-0 overflow-auto border-b border-[color:var(--color-border)] bg-white p-4 lg:border-b-0 lg:border-r">
              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
                  {t("official.route.settings.title", "Impostazioni")}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
                  {selectedSectionRecords.length}{" "}
                  {t("settings.overview.active_definitions").toLowerCase()}
                </p>
              </div>
              {renderSettingsNavigation()}
            </aside>
            <section className="min-h-0 overflow-auto bg-white p-4 sm:p-6">
              {selectedSection ? (
                selectedSection.render && sectionContext ? (
                  <>{selectedSection.render({ ...sectionContext, section: selectedSection })}</>
                ) : (
                  <div className="flex min-h-full items-center justify-center rounded-xl border border-dashed border-[color:var(--color-border-strong)] bg-white p-8">
                    <EmptyState
                      text={t(
                        "settings.form.select_setting",
                        "Seleziona una impostazione dal menu."
                      )}
                    />
                  </div>
                )
              ) : (
                <div className="flex min-h-full items-center justify-center rounded-xl border border-dashed border-[color:var(--color-border-strong)] bg-white p-8">
                  <EmptyState text={t("settings.overview.not_configured")} />
                </div>
              )}
            </section>
          </div>
        ) : null}

        {!isLoading && selectedRecord ? (
          <div className="grid h-full min-h-0 bg-white lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="min-h-0 overflow-auto border-b border-[color:var(--color-border)] bg-white p-4 lg:border-b-0 lg:border-r">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
                    {t("settings.title")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
                    {records.length} {t("settings.overview.active_definitions").toLowerCase()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeSettingsWorkspace}
                  className="rounded-lg border border-[color:var(--color-border)] p-1.5 hover:bg-[color:var(--color-interactive-hover)] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] transition-colors"
                  title={t("common.actions.close")}
                >
                  <Icon name="x" className="h-4 w-4" />
                </button>
              </div>

              {renderSettingsNavigation()}
            </aside>

            <section className="min-h-0 overflow-auto bg-white p-4 sm:p-6">
              <div className="mx-auto grid max-w-3xl gap-4">
                <div className="rounded-xl border border-[color:var(--color-border)] bg-white p-5 shadow-[var(--shadow-sm)]">
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge tone={selectedRecord.status === "active" ? "success" : "warning"}>
                          {translateStatusLabel(selectedRecord.status, t)}
                        </Badge>
                        <Badge>{selectedRecord.ownerPluginId}</Badge>
                      </div>
                      <h3 className="truncate text-lg font-semibold text-[color:var(--color-ink)]">
                        {formatSettingFormLabel(selectedRecord)}
                      </h3>
                      <p className="mt-1 truncate text-xs text-[color:var(--color-ink-muted)]">
                        {selectedRecord.key}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-[color:var(--color-ink-muted)]">
                      {formatDateTime(valueRecord?.updatedAt ?? selectedRecord.updatedAt)}
                    </p>
                  </div>

                  <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveSettingValue();
                    }}
                  >
                    {isValueLoading ? (
                      <EmptyState text={t("settings.empty.loading_value")} />
                    ) : null}
                    {valueError ? <ErrorBanner message={valueError} /> : null}
                    {renderSettingValueField(selectedRecord)}
                    {selectedRecord.secret ? (
                      <p className="text-xs text-[color:var(--color-ink-muted)]">
                        {t(
                          "settings.form.secret_readonly",
                          "I valori secret si aggiornano da un flusso dedicato."
                        )}
                      </p>
                    ) : null}
                    {!selectedRecord.mutable ? (
                      <p className="text-xs text-[color:var(--color-ink-muted)]">
                        {t("settings.form.readonly", "Questa impostazione e in sola lettura.")}
                      </p>
                    ) : null}
                    {saveError ? <ErrorBanner message={saveError} /> : null}
                    {saveMessage ? (
                      <p className="text-sm font-medium text-[color:var(--color-success-ink)]">
                        {saveMessage}
                      </p>
                    ) : null}
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={isSaving || selectedRecord.secret || !selectedRecord.mutable}
                      >
                        {isSaving
                          ? t("common.actions.saving", "Salvataggio...")
                          : t("common.actions.save", "Salva")}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function filterRecordsForSettingsSection(
  records: readonly SettingDefinitionRecord[],
  section: RenderableAdminSettingsSection
): readonly SettingDefinitionRecord[] {
  if (section.id.endsWith("settings-catalog")) {
    return records;
  }

  const explicitKeys = new Set(
    (section.settingKeys ?? []).map((key) => key.trim().toLowerCase()).filter(Boolean)
  );
  if (explicitKeys.size > 0) {
    return records.filter((record) => explicitKeys.has(record.key.trim().toLowerCase()));
  }

  const category = section.category?.trim().toLowerCase();
  if (category) {
    return records.filter((record) => record.category?.trim().toLowerCase() === category);
  }

  return [];
}

function formatSettingNavLabel(record: SettingDefinitionRecord): string {
  const parts = record.key.split(":");
  return parts[parts.length - 1]?.replace(/[-_]/g, " ") || record.key;
}

function formatSettingFormLabel(record: SettingDefinitionRecord): string {
  const label = formatSettingNavLabel(record);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getSettingValueKind(
  record: SettingDefinitionRecord
): "string" | "number" | "boolean" | "json" {
  const schemaType = readSchemaType(record.schema);
  if (schemaType === "string" || schemaType === "number" || schemaType === "boolean") {
    return schemaType;
  }
  if (schemaType === "integer") {
    return "number";
  }
  if (schemaType === "array" || schemaType === "object") {
    return "json";
  }

  const sample = record.defaultValue;
  if (typeof sample === "number") return "number";
  if (typeof sample === "boolean") return "boolean";
  if (Array.isArray(sample) || (sample && typeof sample === "object")) return "json";
  return "string";
}

function readSchemaType(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const type = (value as { type?: unknown }).type;
  return typeof type === "string" ? type : undefined;
}

function getSettingEnumOptions(value: unknown): readonly string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const enumValues = (value as { enum?: unknown }).enum;
  if (!Array.isArray(enumValues)) {
    return [];
  }

  return enumValues
    .filter((entry): entry is string | number | boolean =>
      ["string", "number", "boolean"].includes(typeof entry)
    )
    .map((entry) => String(entry));
}

function parseSettingFormValue(record: SettingDefinitionRecord, value: string): SettingJsonValue {
  const valueKind = getSettingValueKind(record);
  if (valueKind === "number") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new Error("Il valore deve essere numerico.");
    }
    return parsed;
  }
  if (valueKind === "boolean") {
    return value === "true";
  }
  if (valueKind === "json") {
    return JSON.parse(value) as SettingJsonValue;
  }
  return value;
}
