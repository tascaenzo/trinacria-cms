import { useActionState, useCallback, useEffect, useState } from "react";
import {
  type AsyncActionState,
  createIdleAsyncActionState,
  readOptionalString
} from "../../runtime/action-state.js";
import { cms } from "../../runtime/cms-sdk.js";
import { getSdkErrorDetails, toDisplayError } from "../../lib/sdk-errors.js";
import type { TranslateFn } from "../../lib/i18n.js";
import {
  toEditableSettingInput,
  type SettingDefinitionRecord,
  type SettingDraftValues,
  type SettingValueErrors
} from "./settings-page.utils.js";

type CmsOverviewField = "siteName" | "siteUrl" | "locale" | "timezone";
export type CmsOverviewItem = {
  field: CmsOverviewField;
  key: string | null;
  value: string | null;
  status: "resolved" | "missing" | "error";
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

export function useSettingsDefinitions() {
  const [records, setRecords] = useState<readonly SettingDefinitionRecord[]>([]);
  const [ownerPluginId, setOwnerPluginId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  return {
    error,
    filterState,
    isFilterPending,
    isLoading,
    ownerPluginId,
    records,
    refresh,
    submitFilter
  };
}

export function useSettingsOverview(records: readonly SettingDefinitionRecord[]) {
  const [overviewItems, setOverviewItems] = useState<readonly CmsOverviewItem[]>([]);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);

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

  return { isOverviewLoading, overviewItems };
}

export function useSettingsSectionDrafts(
  selectedSectionRecords: readonly SettingDefinitionRecord[],
  t: TranslateFn
) {
  const [sectionDraftValues, setSectionDraftValues] = useState<SettingDraftValues>({});
  const [sectionValueErrors, setSectionValueErrors] = useState<SettingValueErrors>({});
  const [isSectionValuesLoading, setIsSectionValuesLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadSectionValues() {
      setIsSectionValuesLoading(true);
      setSectionValueErrors({});

      const nextDrafts: SettingDraftValues = {};
      const nextErrors: SettingValueErrors = {};

      await Promise.all(
        selectedSectionRecords.map(async (record) => {
          if (record.secret) {
            nextDrafts[record.key] = "";
            return;
          }

          try {
            const response = await cms.settings.getSettingValueByKey({ path: { key: record.key } });
            nextDrafts[record.key] = toEditableSettingInput(
              response.data?.value ?? record.defaultValue ?? null
            );
          } catch (currentError) {
            const details = getSdkErrorDetails(currentError);
            nextDrafts[record.key] = toEditableSettingInput(record.defaultValue ?? null);
            if (details.status !== 404) {
              nextErrors[record.key] =
                details.message ??
                t("settings.inspect.value_unavailable", "Valore non disponibile.");
            }
          }
        })
      );

      if (isCancelled) return;
      setSectionDraftValues(nextDrafts);
      setSectionValueErrors(nextErrors);
      setIsSectionValuesLoading(false);
    }

    void loadSectionValues();

    return () => {
      isCancelled = true;
    };
  }, [selectedSectionRecords, t]);

  return {
    isSectionValuesLoading,
    sectionDraftValues,
    sectionValueErrors,
    setSectionDraftValues
  };
}

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
