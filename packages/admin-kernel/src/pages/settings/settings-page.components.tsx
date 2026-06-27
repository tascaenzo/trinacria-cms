import { Badge, Button, Icon, Input, Select, Textarea } from "@trinacria-cms/trinacria-ui";
import { ErrorBanner, EmptyState } from "../../components/resource-feedback.js";
import type { TranslateFn } from "../../lib/i18n.js";
import { cms } from "../../runtime/cms-sdk.js";
import { toDisplayError } from "../../lib/sdk-errors.js";
import { useMemo, useState } from "react";
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
  const pluginAccessRecord = editableRecords.find(
    (record) => record.key === "core-pack:security:plugin_access_grants"
  );

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

          {!isLoading && pluginAccessRecord ? (
            <PluginPermissionCenter
              draftValue={
                draftValues[pluginAccessRecord.key] ??
                toEditableSettingInput(pluginAccessRecord.defaultValue ?? [])
              }
              isSaving={isSaving}
              onChange={(value) => onDraftValueChange(pluginAccessRecord.key, value)}
              record={pluginAccessRecord}
              t={t}
            />
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
                    {group.records
                      .filter((record) => record.key !== "core-pack:security:plugin_access_grants")
                      .map((record) => (
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

interface PluginAccessGrantDraft {
  id?: string;
  accessType?: string;
  producerPluginId: string;
  consumerPluginId: string;
  eventName: string;
  payloadType?: string;
  requiredPermission: string;
  status: "pending" | "approved" | "denied" | "revoked";
  reason?: string;
  approvedBy?: string;
  approvedAt?: string;
  updatedAt?: string;
}

function PluginPermissionCenter({
  draftValue,
  isSaving,
  onChange,
  record,
  t
}: {
  draftValue: string;
  isSaving: boolean;
  onChange: (value: string) => void;
  record: SettingDefinitionRecord;
  t: TranslateFn;
}) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const grants = useMemo(() => parsePluginAccessGrantDrafts(draftValue), [draftValue]);

  async function updateGrant(
    grant: PluginAccessGrantDraft,
    status: PluginAccessGrantDraft["status"]
  ) {
    const now = new Date().toISOString();
    const next = grants.map((item) =>
      getPluginGrantId(item) === getPluginGrantId(grant)
        ? {
            ...item,
            id: getPluginGrantId(item),
            status,
            approvedBy: status === "approved" ? "backoffice" : item.approvedBy,
            approvedAt: status === "approved" ? now : item.approvedAt,
            updatedAt: now
          }
        : item
    );
    const value = JSON.stringify(next, null, 2);
    onChange(value);
    try {
      setLocalError(null);
      setLocalMessage(null);
      await cms.settings.upsertSettingValue({
        path: { key: record.key },
        body: { value: next, updatedBy: "backoffice" }
      });
      setLocalMessage(t("settings.plugin_permissions.saved", "Permissione aggiornata."));
    } catch (error) {
      setLocalError(toDisplayError(error));
    }
  }

  return (
    <section className="grid gap-4">
      <div>
        <h4 className="text-sm font-semibold text-[color:var(--color-ink)]">
          {t("settings.plugin_permissions.access_requests", "Richieste accesso plugin")}
        </h4>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          {t(
            "settings.plugin_permissions.access_requests_summary",
            "Approva o revoca accessi a eventi sensibili e payload sicuri."
          )}
        </p>
      </div>
      {localError ? <ErrorBanner message={localError} /> : null}
      {localMessage ? (
        <p className="text-sm font-medium text-[color:var(--color-success-ink)]">{localMessage}</p>
      ) : null}
      {grants.length === 0 ? (
        <EmptyState
          text={t("settings.plugin_permissions.empty", "Nessuna richiesta registrata.")}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-[color:var(--color-border)]">
          <div className="grid bg-[color:var(--color-surface-subtle)] px-4 py-2 text-xs font-semibold uppercase text-[color:var(--color-ink-muted)] md:grid-cols-[1fr_1fr_1fr_auto]">
            <span>{t("settings.plugin_permissions.consumer", "Consumer")}</span>
            <span>{t("settings.plugin_permissions.access", "Accesso")}</span>
            <span>{t("common.table.status", "Stato")}</span>
            <span>{t("common.table.action", "Azione")}</span>
          </div>
          {grants.map((grant) => (
            <div
              key={getPluginGrantId(grant)}
              className="grid gap-3 border-t border-[color:var(--color-border)] px-4 py-3 text-sm md:grid-cols-[1fr_1fr_1fr_auto] md:items-center"
            >
              <div>
                <p className="font-semibold text-[color:var(--color-ink)]">
                  {grant.producerPluginId} {"->"} {grant.consumerPluginId}
                </p>
                <p className="text-xs text-[color:var(--color-ink-muted)]">{grant.eventName}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-[color:var(--color-ink)]">
                  {grant.payloadType ?? grant.accessType ?? "event"}
                </p>
                <p className="truncate text-xs text-[color:var(--color-ink-muted)]">
                  {grant.requiredPermission}
                </p>
              </div>
              <div>
                <Badge>{grant.status}</Badge>
                {grant.reason ? (
                  <p className="mt-1 text-xs text-[color:var(--color-ink-muted)]">{grant.reason}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={isSaving || grant.status === "approved"}
                  onClick={() => void updateGrant(grant, "approved")}
                >
                  {t("common.actions.approve", "Approva")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isSaving || grant.status === "denied"}
                  onClick={() => void updateGrant(grant, "denied")}
                >
                  {t("common.actions.deny", "Nega")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isSaving || grant.status === "revoked"}
                  onClick={() => void updateGrant(grant, "revoked")}
                >
                  {t("common.actions.revoke", "Revoca")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
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

function parsePluginAccessGrantDrafts(value: string): PluginAccessGrantDraft[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const record = item as Record<string, unknown>;
      const status = readGrantStatus(record.status);
      const producerPluginId = readString(record.producerPluginId);
      const consumerPluginId = readString(record.consumerPluginId);
      const eventName = readString(record.eventName);
      const requiredPermission = readString(record.requiredPermission);
      if (!status || !producerPluginId || !consumerPluginId || !eventName || !requiredPermission) {
        return [];
      }
      return [
        {
          id: readOptionalString(record.id),
          accessType: readOptionalString(record.accessType),
          producerPluginId,
          consumerPluginId,
          eventName,
          payloadType: readOptionalString(record.payloadType),
          requiredPermission,
          status,
          reason: readOptionalString(record.reason),
          approvedBy: readOptionalString(record.approvedBy),
          approvedAt: readOptionalString(record.approvedAt),
          updatedAt: readOptionalString(record.updatedAt)
        }
      ];
    });
  } catch {
    return [];
  }
}

function getPluginGrantId(grant: PluginAccessGrantDraft): string {
  return (
    grant.id ??
    [
      grant.accessType ?? "access",
      grant.producerPluginId,
      grant.consumerPluginId,
      grant.eventName,
      grant.payloadType ?? "*",
      grant.requiredPermission
    ]
      .map((value) => value.trim().toLowerCase())
      .join("|")
  );
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readGrantStatus(value: unknown): PluginAccessGrantDraft["status"] | undefined {
  if (value === "pending" || value === "approved" || value === "denied" || value === "revoked") {
    return value;
  }
  return undefined;
}
