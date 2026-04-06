import { useActionState, useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Dialog, Input, JsonView, Textarea } from "@trinacria-cms/admin-ui";
import type {
  GetSettingSecretMetadataResponse,
  GetSettingValueByKeyResponse,
  ListSettingDefinitionsResponse,
} from "@trinacria-cms/sdk";
import { MobileRecordCard, MobileRecordField, MobileRecordList } from "../components/mobile-records.js";
import { ErrorBanner, EmptyState } from "../components/resource-feedback.js";
import { formatDateTime } from "../lib/formatting.js";
import {
  type AsyncActionState,
  createIdleAsyncActionState,
  readOptionalString,
} from "../runtime/action-state.js";
import { cms } from "../runtime/cms-sdk.js";
import { getSdkErrorDetails, toDisplayError } from "../lib/sdk-errors.js";
import { useI18n } from "../lib/i18n.js";
import { translateSettingSource, translateStatusLabel } from "../lib/ui-translations.js";

type SettingDefinitionRecord = ListSettingDefinitionsResponse["data"][number];
type SettingValueRecord = GetSettingValueByKeyResponse["data"] | null;
type SettingSecretMetadataRecord = GetSettingSecretMetadataResponse["data"] | null;
type CmsOverviewField = "siteName" | "siteUrl" | "locale" | "timezone";
type CmsOverviewItem = {
  field: CmsOverviewField;
  key: string | null;
  value: string | null;
  status: "resolved" | "missing" | "error";
};
type PreparedSettingValueRequest = {
  ownerPluginId: string;
  path: string;
  body: {
    value: unknown;
    updatedBy: string;
  };
};

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
      "cms:site.title",
    ],
    match: (key) => key.includes("site") && (key.includes("name") || key.includes("title")),
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
      "cms:public_url",
    ],
    match: (key) =>
      (key.includes("site") || key.includes("public") || key.includes("base")) &&
      (key.includes("url") || key.includes("origin")),
  },
  locale: {
    exact: [
      "core-pack:cms:locale",
      "core-pack:locale",
      "core-pack:cms.locale",
      "core-pack:i18n.locale",
      "cms:locale",
      "site:locale",
    ],
    match: (key) => key.includes("locale") || key.includes("language"),
  },
  timezone: {
    exact: [
      "core-pack:cms:timezone",
      "core-pack:timezone",
      "core-pack:cms.timezone",
      "cms:timezone",
      "site:timezone",
    ],
    match: (key) => key.includes("timezone") || key.includes("time_zone"),
  },
};

function findOverviewSettingKey(
  records: readonly SettingDefinitionRecord[],
  field: CmsOverviewField,
): string | null {
  const definition = CMS_OVERVIEW_CANDIDATES[field];
  const exactMatch = records.find((record) =>
    definition.exact.includes(record.key.trim().toLowerCase()),
  );
  if (exactMatch) return exactMatch.key;

  const heuristicMatch = records.find((record) => definition.match(record.key.trim().toLowerCase()));
  return heuristicMatch?.key ?? null;
}

function stringifySettingValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((entry) => stringifySettingValue(entry)).join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return "";
}

function toEditableJson(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2);
}

/**
 * SettingsPage keeps reads explicit while moving the filter flow to a React 19
 * action-based form instead of manual submit bookkeeping.
 */
export function SettingsPage() {
  const { t } = useI18n();
  const [records, setRecords] = useState<readonly SettingDefinitionRecord[]>([]);
  const [ownerPluginId, setOwnerPluginId] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<SettingDefinitionRecord | null>(null);
  const [valueRecord, setValueRecord] = useState<SettingValueRecord>(null);
  const [error, setError] = useState<string | null>(null);
  const [valueError, setValueError] = useState<string | null>(null);
  const [secretMetadata, setSecretMetadata] = useState<SettingSecretMetadataRecord>(null);
  const [secretError, setSecretError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValueLoading, setIsValueLoading] = useState(false);
  const [isSecretLoading, setIsSecretLoading] = useState(false);
  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const [overviewItems, setOverviewItems] = useState<readonly CmsOverviewItem[]>([]);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);
  const [draftValueJson, setDraftValueJson] = useState("null");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [preparedRequest, setPreparedRequest] = useState<PreparedSettingValueRequest | null>(null);
  const refresh = useCallback(async (nextOwnerPluginId = "") => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await cms.settings.listSettingDefinitions({
        query: {
          ownerPluginId: nextOwnerPluginId || undefined,
          limit: 100,
          offset: 0,
        },
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
        }),
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
            offset: 0,
          },
        });
        setOwnerPluginId(nextOwnerPluginId);
        setRecords(response.data);
        setError(null);
        return { ok: true, error: null, data: nextOwnerPluginId };
      } catch (currentError) {
        return {
          ok: false,
          error: toDisplayError(currentError),
          data: null,
        };
      }
    },
    createIdleAsyncActionState<string>(),
  );

  async function inspectRecord(record: SettingDefinitionRecord) {
    setSelectedRecord(record);
    setIsInspectOpen(true);
    setIsValueLoading(true);
    setIsSecretLoading(true);
    setValueError(null);
    setSecretError(null);
    setPreparedRequest(null);
    setDraftError(null);
    try {
      const [valueResult, secretResult] = await Promise.allSettled([
        cms.settings.getSettingValueByKey({ path: { key: record.key } }),
        cms.settings.getSettingSecretMetadata({ path: { key: record.key } }),
      ]);

      if (valueResult.status === "fulfilled") {
        setValueRecord(valueResult.value.data);
        setValueError(null);
      } else {
        const details = getSdkErrorDetails(valueResult.reason);
        if (details.status === 404) {
          setValueRecord(null);
          setValueError(null);
        } else {
          setValueRecord(null);
          setValueError(details.message ?? t("settings.inspect.value_unavailable"));
        }
      }

      if (secretResult.status === "fulfilled") {
        setSecretMetadata(secretResult.value.data);
        setSecretError(null);
      } else {
        const details = getSdkErrorDetails(secretResult.reason);
        if (details.status === 404) {
          setSecretMetadata(null);
          setSecretError(null);
        } else {
          setSecretMetadata(null);
          setSecretError(details.message ?? t("settings.inspect.secret_unavailable"));
        }
      }
    } catch (currentError) {
      setValueRecord(null);
      setSecretMetadata(null);
      setValueError(toDisplayError(currentError));
      setSecretError(null);
    } finally {
      setIsValueLoading(false);
      setIsSecretLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedRecord) return;

    const baseValue =
      valueRecord?.value ?? selectedRecord.defaultValue ?? selectedRecord.schema ?? null;
    setDraftValueJson(toEditableJson(baseValue));
    setDraftError(null);
    setPreparedRequest(null);
  }, [selectedRecord, valueRecord]);

  function prepareValueWriteHandoff() {
    if (!selectedRecord) return;

    try {
      const parsed = JSON.parse(draftValueJson);
      setPreparedRequest({
        ownerPluginId: selectedRecord.ownerPluginId,
        path: `/v1/settings/values/${selectedRecord.key}`,
        body: {
          value: parsed,
          updatedBy: "backoffice:prepared-handoff",
        },
      });
      setDraftError(null);
    } catch {
      setPreparedRequest(null);
      setDraftError(t("settings.write_flow.invalid_json"));
    }
  }

  const activeDefinitionsCount = records.filter((record) => record.status === "active").length;
  const ownerPluginsCount = new Set(records.map((record) => record.ownerPluginId)).size;

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

  return (
    <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
      <Card eyebrow={t("settings.eyebrow")} title={t("settings.title")}>
        <div className="mb-5 flex flex-col gap-4 border-b border-[color:var(--color-border)] pb-4">
          <form
            key={ownerPluginId}
            className="grid gap-4 md:grid-cols-[1fr_auto_auto]"
            action={submitFilter}
          >
            <Input
              label={t("settings.filter.owner_plugin")}
              name="ownerPluginId"
              defaultValue={ownerPluginId}
              hint={t("settings.filter.owner_plugin_hint")}
            />
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
          </form>
          {filterState.error ? <ErrorBanner message={filterState.error} /> : null}
          <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
            {t("settings.summary")}
          </p>
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
                  <MobileRecordField
                    label={t("common.table.owner")}
                    value={record.ownerPluginId}
                  />
                </MobileRecordCard>
              ))}
            </MobileRecordList>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--color-border)] text-left text-[color:var(--color-ink-subtle)]">
                    <th className="px-4 py-3 font-medium">{t("common.table.key")}</th>
                    <th className="px-4 py-3 font-medium">{t("common.table.owner")}</th>
                    <th className="px-4 py-3 font-medium">{t("common.table.status")}</th>
                    <th className="px-4 py-3 font-medium">{t("common.table.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b border-[color:var(--color-border)] last:border-b-0">
                      <td className="px-4 py-4">
                        <p className="font-medium text-[color:var(--color-ink)]">{record.key}</p>
                        <p className="mt-1 text-[color:var(--color-ink-muted)]">
                          {record.category ?? t("settings.uncategorized")}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-[color:var(--color-ink-muted)]">{record.ownerPluginId}</td>
                      <td className="px-4 py-4">
                        <Badge tone={record.status === "active" ? "success" : "warning"}>
                          {translateStatusLabel(record.status, t)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Button variant="secondary" onClick={() => inspectRecord(record)}>
                          {t("common.actions.inspect_json")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
              <div className="grid gap-3 sm:grid-cols-2">
                {overviewItems.map((item) => (
                  <div
                    key={item.field}
                    className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] p-4"
                  >
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
                      {renderOverviewLabel(item.field)}
                    </p>
                    <p className="mt-2 break-words text-base font-semibold text-[color:var(--color-ink)]">
                      {renderOverviewValue(item)}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-ink-muted)]">
                      {item.key
                        ? `${t("settings.overview.detected_key")} ${item.key}`
                        : t("settings.overview.not_configured_hint")}
                    </p>
                  </div>
                ))}
                <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
                    {t("settings.overview.active_definitions")}
                  </p>
                  <p className="mt-2 text-base font-semibold text-[color:var(--color-ink)]">
                    {activeDefinitionsCount}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--color-ink-muted)]">
                    {t("settings.overview.active_definitions_hint")}
                  </p>
                </div>
                <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
                    {t("settings.overview.owner_plugins")}
                  </p>
                  <p className="mt-2 text-base font-semibold text-[color:var(--color-ink)]">
                    {ownerPluginsCount}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--color-ink-muted)]">
                    {t("settings.overview.owner_plugins_hint")}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        <Card eyebrow={t("settings.policy.eyebrow")} title={t("settings.policy.title")}>
          <div className="grid gap-4">
            <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] p-4">
              <p className="text-sm font-medium text-[color:var(--color-ink)]">
                {t("settings.policy.ownership.title")}
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
                {t("settings.policy.ownership.body")}
              </p>
            </div>
            <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] p-4">
              <p className="text-sm font-medium text-[color:var(--color-ink)]">
                {t("settings.policy.json_first.title")}
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
                {t("settings.policy.json_first.body")}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Dialog
        open={isInspectOpen}
        title={
          selectedRecord
            ? `${t("settings.inspect.title_prefix")} ${selectedRecord.key}`
            : t("settings.inspect.title")
        }
        description={t("settings.inspect.description")}
        closeLabel={t("common.actions.close")}
        onClose={() => setIsInspectOpen(false)}
        width="xl"
      >
        {selectedRecord ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={selectedRecord.status === "active" ? "success" : "warning"}>
                  {translateStatusLabel(selectedRecord.status, t)}
                </Badge>
                <Badge>{selectedRecord.ownerPluginId}</Badge>
              </div>
              <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] p-4 text-sm text-[color:var(--color-ink-muted)]">
                <p>
                  <span className="font-medium text-[color:var(--color-ink)]">
                    {t("settings.inspect.category")}
                  </span>{" "}
                  {selectedRecord.category ?? t("settings.uncategorized")}
                </p>
                <p className="mt-2">
                  <span className="font-medium text-[color:var(--color-ink)]">
                    {t("common.table.updated")}
                  </span>{" "}
                  {formatDateTime(selectedRecord.updatedAt)}
                </p>
              </div>
              <JsonView title={t("settings.inspect.definition_json")} value={selectedRecord} />
            </div>
            <div className="grid gap-4">
              {isValueLoading ? <EmptyState text={t("settings.empty.loading_value")} /> : null}
              {valueError ? <ErrorBanner message={valueError} /> : null}
              {secretError ? <ErrorBanner message={secretError} /> : null}
              {valueRecord ? (
                <>
                  <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] p-4 text-sm text-[color:var(--color-ink-muted)]">
                    <p>
                      <span className="font-medium text-[color:var(--color-ink)]">
                        {t("settings.inspect.source")}
                      </span>{" "}
                      {translateSettingSource(valueRecord.source, t)}
                    </p>
                    <p className="mt-2">
                      <span className="font-medium text-[color:var(--color-ink)]">
                        {t("common.table.owner")}
                      </span>{" "}
                      {valueRecord.ownerPluginId}
                    </p>
                    <p className="mt-2">
                      <span className="font-medium text-[color:var(--color-ink)]">
                        {t("common.table.updated")}
                      </span>{" "}
                      {formatDateTime(valueRecord.updatedAt)}
                    </p>
                  </div>
                  <JsonView title={t("settings.inspect.resolved_value_json")} value={valueRecord.value} />
                </>
              ) : null}
              {!isValueLoading && !valueError && !valueRecord ? (
                <EmptyState text={t("settings.inspect.no_resolved_value")} />
              ) : null}
              {isSecretLoading ? <EmptyState text={t("settings.inspect.loading_secret")} /> : null}
              {secretMetadata ? (
                <>
                  <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] p-4 text-sm text-[color:var(--color-ink-muted)]">
                    <p>
                      <span className="font-medium text-[color:var(--color-ink)]">
                        {t("settings.inspect.secret_algorithm")}
                      </span>{" "}
                      {secretMetadata.algorithm}
                    </p>
                    <p className="mt-2">
                      <span className="font-medium text-[color:var(--color-ink)]">
                        {t("settings.inspect.secret_key_version")}
                      </span>{" "}
                      {secretMetadata.keyVersion}
                    </p>
                    <p className="mt-2">
                      <span className="font-medium text-[color:var(--color-ink)]">
                        {t("settings.inspect.secret_masked")}
                      </span>{" "}
                      {secretMetadata.maskedValue}
                    </p>
                  </div>
                  <JsonView title={t("settings.inspect.secret_metadata_json")} value={secretMetadata} />
                </>
              ) : null}
              {!isSecretLoading && !secretError && !secretMetadata ? (
                <EmptyState text={t("settings.inspect.no_secret_metadata")} />
              ) : null}
              <div className="grid gap-4 rounded-2xl border border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-panel-soft)] p-4">
                <div>
                  <p className="text-sm font-medium text-[color:var(--color-ink)]">
                    {t("settings.write_flow.title")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
                    {t("settings.write_flow.summary")}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-[color:var(--color-border)] bg-white p-3 text-sm text-[color:var(--color-ink-muted)]">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
                      {t("settings.write_flow.method")}
                    </p>
                    <p className="mt-2 font-medium text-[color:var(--color-ink)]">PUT</p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--color-border)] bg-white p-3 text-sm text-[color:var(--color-ink-muted)]">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
                      {t("settings.write_flow.owner")}
                    </p>
                    <p className="mt-2 font-medium text-[color:var(--color-ink)]">
                      {selectedRecord.ownerPluginId}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--color-border)] bg-white p-3 text-sm text-[color:var(--color-ink-muted)]">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
                      {t("settings.write_flow.mode")}
                    </p>
                    <p className="mt-2 font-medium text-[color:var(--color-ink)]">
                      {t("settings.write_flow.mode_value")}
                    </p>
                  </div>
                </div>
                <Textarea
                  label={t("settings.write_flow.draft_label")}
                  hint={t("settings.write_flow.draft_hint")}
                  value={draftValueJson}
                  onChange={(event) => {
                    setDraftValueJson(event.target.value);
                    setDraftError(null);
                    setPreparedRequest(null);
                  }}
                />
                {draftError ? <ErrorBanner message={draftError} /> : null}
                <div className="flex flex-wrap gap-3">
                  <Button type="button" onClick={prepareValueWriteHandoff}>
                    {t("settings.write_flow.prepare")}
                  </Button>
                </div>
                {preparedRequest ? (
                  <div className="grid gap-4">
                    <div className="rounded-xl border border-[color:var(--color-border)] bg-white p-4 text-sm text-[color:var(--color-ink-muted)]">
                      <p>
                        <span className="font-medium text-[color:var(--color-ink)]">
                          {t("settings.write_flow.endpoint")}
                        </span>{" "}
                        {preparedRequest.path}
                      </p>
                      <p className="mt-2">
                        <span className="font-medium text-[color:var(--color-ink)]">
                          {t("settings.write_flow.headers")}
                        </span>{" "}
                        {t("settings.write_flow.headers_value")}
                      </p>
                    </div>
                    <JsonView title={t("settings.write_flow.body_title")} value={preparedRequest.body} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
